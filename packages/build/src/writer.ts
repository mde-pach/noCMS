import { existsSync } from "node:fs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PrerenderedPage } from "./prerender";

export function routeToFilePath(routePath: string): string {
  const trimmed = routePath.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed ? `${trimmed}/index.html` : "index.html";
}

export async function writePage(outDir: string, page: PrerenderedPage): Promise<void> {
  const file = join(outDir, routeToFilePath(page.path));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page.html);
}

// Copied into the output only when a page hydrates an island. Resolved from the vendored bundle:
// a fork has no monorepo to rebuild it from, so it ships the prebuilt artifact verbatim.
export const ISLAND_CLIENT_FILE = "_nocms/islands.js";

export async function writeIslandClient(root: string, outDir: string): Promise<void> {
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

// Emitted only when the site provides `editor.json` and the prebuilt bundle is present. The bundle
// is heavy (MDX compiler + prose editor) but lazy-loaded on `?edit`, so readers never download it.
export const EDITOR_CLIENT_FILE = "_nocms/editor.js";

export async function writeEditorClient(root: string, outDir: string): Promise<void> {
  const source = editorClientBundlePath(root);
  if (!source) return;
  const dest = join(outDir, EDITOR_CLIENT_FILE);
  await mkdir(dirname(dest), { recursive: true });
  await cp(source, dest);
}

export function editorClientBundlePath(root: string): string | undefined {
  const candidates = [
    join(root, "vendor", "build", "editor.client.js"),
    fileURLToPath(new URL("./editor.client.js", import.meta.url)),
  ];
  return candidates.find((p) => existsSync(p));
}
