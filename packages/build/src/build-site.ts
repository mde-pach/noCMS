import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
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

  const tokensFile = join(root, "theme.tokens");
  const css = existsSync(tokensFile)
    ? toCssVariables(parseTokens(await readFile(tokensFile, "utf8")))
    : undefined;

  const components: ComponentMap = Object.fromEntries(
    Object.entries(registry).map(([name, entry]) => [name, entry.component]),
  );

  const publicDir = join(root, "public");
  const faviconHref = existsSync(join(publicDir, "favicon.svg"))
    ? `<link rel="icon" type="image/svg+xml" href="${base}favicon.svg"/>`
    : undefined;

  const pages = await prerenderRoutes(routes, { components, css, head: faviconHref });

  await rm(outDir, { recursive: true, force: true });
  await Promise.all(pages.map((page) => writePage(outDir, page)));

  if (existsSync(publicDir)) await cp(publicDir, outDir, { recursive: true });
}

async function writePage(outDir: string, page: PrerenderedPage): Promise<void> {
  const file = join(outDir, routeToFilePath(page.path));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page.html);
}
