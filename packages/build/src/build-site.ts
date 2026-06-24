import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "@nocms/components";
import { parseFrontmatter } from "@nocms/core";
import type { ComponentMap } from "@nocms/renderer";
import { parseTokens, toCssVariables } from "@nocms/tokens";
import { type PrerenderedPage, prerenderRoutes, type Route } from "./prerender";

export interface BuildOptions {
  /** site source root (the forked starter) */
  root: string;
  /** output dir deployed to Pages */
  outDir: string;
  /** base path, e.g. `/<repo>/` for project Pages; `/` for a custom domain. */
  base: string;
}

/** A content file (relative POSIX path under `content/`) → its route path. */
export function contentPathToRoute(relPath: string): string {
  const segments = relPath
    .replace(/\.mdx?$/, "")
    .split("/")
    .filter(Boolean);
  if (segments.at(-1) === "index") segments.pop();
  return `/${segments.join("/")}`;
}

/** A route path → its output file. `/` → `index.html`, `/x` → `x/index.html`. */
export function routeToFilePath(routePath: string): string {
  const trimmed = routePath.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed ? `${trimmed}/index.html` : "index.html";
}

/** Non-empty and slash-terminated, so `${base}asset` always joins correctly. */
export function normalizeBase(base: string): string {
  if (!base) return "/";
  return base.endsWith("/") ? base : `${base}/`;
}

async function walkMdx(dir: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await walkMdx(join(dir, entry.name), rel)));
    else if (/\.mdx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}

async function loadRoutes(contentDir: string): Promise<Route[]> {
  const files = await walkMdx(contentDir);
  return Promise.all(
    files.map(async (rel) => {
      const { data, body } = parseFrontmatter(
        await readFile(join(contentDir, rel), "utf8"),
      );
      return { path: contentPathToRoute(rel), mdx: body, data };
    }),
  );
}

/**
 * Prerender a site to a static `outDir`: load content into routes, render each via
 * the one renderer (so preview and publish cannot diverge), inject runtime token CSS,
 * and copy `public/` assets. Curated components prerender to static HTML; island
 * hydration is a separate tier (D6) and is not wired here.
 */
export async function buildSite(options: BuildOptions): Promise<void> {
  const { root, outDir } = options;
  const base = normalizeBase(options.base);

  const routes = await loadRoutes(join(root, "content"));

  const css = await collectCss(root);

  const components: ComponentMap = Object.fromEntries(
    Object.entries(registry).map(([name, entry]) => [name, entry.component]),
  );
  const islands = Object.entries(registry)
    .filter(([, entry]) => entry.island)
    .map(([name]) => name);

  const publicDir = join(root, "public");
  const faviconHref = existsSync(join(publicDir, "favicon.svg"))
    ? `<link rel="icon" type="image/svg+xml" href="${base}favicon.svg"/>`
    : "";
  const head = await collectHead(root, faviconHref);
  const editor = await collectEditor(root, base);

  const pages = await prerenderRoutes(routes, {
    components,
    css,
    head: head || undefined,
    islands,
    islandClientSrc: `${base}${ISLAND_CLIENT_FILE}`,
    editor,
  });

  await rm(outDir, { recursive: true, force: true });
  await Promise.all(pages.map((page) => writePage(outDir, page)));

  if (pages.some((page) => page.islands.length)) await writeIslandClient(root, outDir);
  if (editor) await writeEditorClient(root, outDir);
  if (existsSync(publicDir)) await cp(publicDir, outDir, { recursive: true });
}

// The committed, prebuilt island client bundle a fork serves verbatim (D1), copied into the
// output only when a page actually hydrates an island. Resolved from the vendored package so a
// fork — which has no monorepo to rebuild it from — ships the same artifact it was forked with.
const ISLAND_CLIENT_FILE = "_nocms/islands.js";

async function writeIslandClient(root: string, outDir: string): Promise<void> {
  const source = islandClientBundlePath(root);
  if (!source || !existsSync(source)) return;
  const dest = join(outDir, ISLAND_CLIENT_FILE);
  await mkdir(dirname(dest), { recursive: true });
  await cp(source, dest);
}

function islandClientBundlePath(root: string): string | undefined {
  const candidates = [
    join(root, "vendor", "build", "islands.client.js"),
    fileURLToPath(new URL("./islands.client.js", import.meta.url)),
  ];
  return candidates.find((p) => existsSync(p));
}

// The in-site editor, opt-in: only when the site provides `editor.json` (the per-component
// schemas) AND the prebuilt editor bundle is present. The bundle is heavy (MDX compiler + prose
// editor) but lazy-loaded on `?edit`, so readers never download it.
const EDITOR_CLIENT_FILE = "_nocms/editor.js";

async function collectEditor(
  root: string,
  base: string,
): Promise<
  { clientSrc: string; tokens?: string; schemas?: Record<string, unknown> } | undefined
> {
  const schemasFile = join(root, "editor.json");
  if (!existsSync(schemasFile) || !editorClientBundlePath(root)) return undefined;
  const schemas = JSON.parse(await readFile(schemasFile, "utf8")) as Record<
    string,
    unknown
  >;
  const tokensFile = join(root, "theme.tokens");
  const tokens = existsSync(tokensFile)
    ? await readFile(tokensFile, "utf8")
    : undefined;
  return { clientSrc: `${base}${EDITOR_CLIENT_FILE}`, tokens, schemas };
}

async function writeEditorClient(root: string, outDir: string): Promise<void> {
  const source = editorClientBundlePath(root);
  if (!source) return;
  const dest = join(outDir, EDITOR_CLIENT_FILE);
  await mkdir(dirname(dest), { recursive: true });
  await cp(source, dest);
}

function editorClientBundlePath(root: string): string | undefined {
  const candidates = [
    join(root, "vendor", "build", "editor.client.js"),
    fileURLToPath(new URL("./editor.client.js", import.meta.url)),
  ];
  return candidates.find((p) => existsSync(p));
}

// Runtime token CSS, then the optional site theme stylesheet — so the published <head> styles
// match what the dev reader loads (`styles.css`). Token vars first so the theme can reference
// them; both are plain CSS the prerender inlines into one <style>.
async function collectCss(root: string): Promise<string | undefined> {
  const parts: string[] = [];
  const tokensFile = join(root, "theme.tokens");
  if (existsSync(tokensFile)) {
    parts.push(toCssVariables(parseTokens(await readFile(tokensFile, "utf8"))));
  }
  const stylesFile = join(root, "styles.css");
  if (existsSync(stylesFile)) parts.push(await readFile(stylesFile, "utf8"));
  return parts.length ? parts.join("\n") : undefined;
}

// The favicon link plus the site's optional extra <head> markup (`head.html`, e.g. web-font
// links), so publish matches the dev `index.html` head.
async function collectHead(root: string, faviconHref: string): Promise<string> {
  const headFile = join(root, "head.html");
  const extra = existsSync(headFile) ? await readFile(headFile, "utf8") : "";
  return `${faviconHref}${extra}`;
}

async function writePage(outDir: string, page: PrerenderedPage): Promise<void> {
  const file = join(outDir, routeToFilePath(page.path));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page.html);
}
