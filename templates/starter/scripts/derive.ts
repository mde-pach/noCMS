// Regenerates the ② derived files (feed, i18n bundles, search index, sitemap, manifest) into
// `public/` from the starter's content + `nocms.config.json`, so the published site and the dev
// reader serve them as plain files. In a real fork the GitHub Action runs `deriveAll` on each
// publish; in the monorepo this is the manual `bun run derive` that produces the committed demo
// artifacts. Not a build hook — the committed files are authoritative for forks (which have no
// monorepo `@nocms/derive` to regenerate from).

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSiteConfig, parseEntry, type RepoPath } from "@nocms/core";
import { deriveAll, deriveInputFromConfig } from "@nocms/derive";

const starterDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(starterDir, "content");
const publicDir = join(starterDir, "public");

// A file anywhere under a `posts/` directory (default- or other-locale) is a post; the rest are
// pages. The real loader claims files by a collection's glob (D7); the starter's shape is simple
// enough to assign by path.
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
