// Not a build hook: the committed `public/` files are authoritative for forks, which have no
// monorepo `@nocms/derive` to regenerate from. A fork's publish Action runs `deriveAll`; in the
// monorepo `bun run derive` produces the committed demo artifacts.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSiteConfig, parseEntry, type RepoPath } from "@nocms/core";
import { deriveAll, deriveInputFromConfig } from "@nocms/derive";

const starterDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(starterDir, "content");
const publicDir = join(starterDir, "public");

// The real loader claims files by a collection's glob; the starter's shape is simple enough to
// assign by path — anything under a `posts/` directory is a post, the rest are pages.
function collectionOf(repoRelative: string): string {
  return /(^|\/)posts\//.test(repoRelative) ? "posts" : "pages";
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

const config = await loadSiteConfig(starterDir);
const files = await walkMdx(contentDir);
const entries = await Promise.all(
  files.map(async (rel) => {
    const repoPath = `content/${rel}` as RepoPath;
    const source = await readFile(join(contentDir, rel), "utf8");
    return parseEntry(collectionOf(rel), repoPath, source);
  }),
);

const artifacts = await deriveAll(deriveInputFromConfig(config, entries));
for (const artifact of artifacts) {
  const dest = join(publicDir, artifact.path);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, artifact.contents);
}

console.log(`derive: wrote ${artifacts.length} files → public/`);
