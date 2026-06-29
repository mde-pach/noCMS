import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_RUNTIME_ID, type SiteConfig, siteRuntime } from "@nocms/core";
import { parseTokens, toCssVariables, toTailwindTheme } from "@nocms/tokens";
import { EDITOR_CLIENT_FILE, editorClientBundlePath } from "./writer";

// Token vars first so the site theme stylesheet can reference them.
export async function collectCss(root: string): Promise<string | undefined> {
  const parts: string[] = [];
  const tokensFile = join(root, "theme.tokens");
  if (existsSync(tokensFile)) {
    parts.push(toCssVariables(parseTokens(await readFile(tokensFile, "utf8"))));
  }
  const stylesFile = join(root, "styles.css");
  if (existsSync(stylesFile)) parts.push(await readFile(stylesFile, "utf8"));
  return parts.length ? parts.join("\n") : undefined;
}

// The same flat token file that drives the runtime CSS vars also generates the Tailwind `@theme`, so
// utilities bind to the very tokens a theme edit swaps. Absent `theme.tokens`, the site ships no
// Tailwind (and the build skips the engine entirely).
export async function collectTailwindTheme(root: string): Promise<string | undefined> {
  const tokensFile = join(root, "theme.tokens");
  if (!existsSync(tokensFile)) return undefined;
  return toTailwindTheme(parseTokens(await readFile(tokensFile, "utf8")));
}

export function collectFavicon(publicDir: string, base: string): string {
  return existsSync(join(publicDir, "favicon.svg"))
    ? `<link rel="icon" type="image/svg+xml" href="${base}favicon.svg"/>`
    : "";
}

export async function collectHead(
  root: string,
  faviconHref: string,
  config: SiteConfig,
  base: string,
): Promise<string> {
  const headFile = join(root, "head.html");
  const extra = existsSync(headFile) ? await readFile(headFile, "utf8") : "";
  return `${faviconHref}${extra}${runtimeConfigMarkup(config, base)}`;
}

export async function collectEditor(
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

// Each part is emitted only when its artifact exists: the feed link needs siteUrl + feed config,
// the locale switcher needs ≥2 locales, so a plain site ships neither.
export function runtimeConfigMarkup(config: SiteConfig, base: string): string {
  const runtime = siteRuntime(config, base);
  const parts: string[] = [];
  if (runtime.feedUrl && config.siteUrl) {
    const absolute = new URL("feed.json", config.siteUrl).href;
    parts.push(
      `<link rel="alternate" type="application/feed+json" href="${absolute}"/>`,
    );
  }
  if (runtime.feedUrl || runtime.translationsUrl) {
    const json = JSON.stringify(runtime).replace(/</g, "\\u003c");
    parts.push(
      `<script type="application/json" id="${SITE_RUNTIME_ID}">${json}</script>`,
    );
  }
  return parts.join("");
}
