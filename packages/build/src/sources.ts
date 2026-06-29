import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { contentPathToRoute, parseFrontmatter } from "@nocms/core";
import type { Route } from "./prerender";

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

export async function loadRoutes(contentDir: string): Promise<Route[]> {
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
