import { existsSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { type ComponentRegistry, registry as coreRegistry } from "@nocms/components";
import { loadSiteConfig } from "@nocms/core";
import type { ComponentMap } from "@nocms/renderer";
import type { ComponentChildren, ComponentType } from "preact";
import {
  collectCss,
  collectEditor,
  collectFavicon,
  collectHead,
  collectTailwindTheme,
} from "./collect";
import { prerenderRoutes } from "./prerender";
import { loadRoutes, normalizeBase } from "./sources";
import {
  ISLAND_CLIENT_FILE,
  writeEditorClient,
  writeIslandClient,
  writePage,
} from "./writer";

export interface BuildOptions {
  root: string;
  outDir: string;
  /**
   * Overrides the config `base` (CI injects the repo name through this), defaulting to it when
   * omitted: `/<repo>/` for project Pages, `/` for a custom domain.
   */
  base?: string;
  /** A fork passes its own composed registry so its site-local components publish. */
  registry?: ComponentRegistry;
  /** Wraps every route in the same shell the editor and reader render, so the published page can't diverge from them. */
  shell?: ComponentType<{ children?: ComponentChildren; base?: string }>;
}

/** Renders every route through the one renderer so the published HTML cannot diverge from the editor preview. */
export async function buildSite(options: BuildOptions): Promise<void> {
  const { root, outDir } = options;
  const registry = options.registry ?? coreRegistry;
  const config = await loadSiteConfig(root);
  const base = normalizeBase(options.base ?? config.base);

  const routes = await loadRoutes(join(root, "content"));

  const css = await collectCss(root);
  const tailwindTheme = await collectTailwindTheme(root);

  const components: ComponentMap = Object.fromEntries(
    Object.entries(registry).map(([name, entry]) => [name, entry.component]),
  );
  const islands = Object.entries(registry)
    .filter(([, entry]) => entry.island)
    .map(([name]) => name);

  const publicDir = join(root, "public");
  const faviconHref = collectFavicon(publicDir, base);
  const head = await collectHead(root, faviconHref, config, base);
  const editor = await collectEditor(root, base);

  const pages = await prerenderRoutes(routes, {
    components,
    shell: options.shell,
    base,
    css,
    tailwind: tailwindTheme ? { theme: tailwindTheme, base: root } : undefined,
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
