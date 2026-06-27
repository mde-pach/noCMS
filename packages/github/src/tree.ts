import type { CollectionDef, CollectionEntry, RepoPath, RepoRef } from "@nocms/core";
import { parseEntry } from "@nocms/core";
import { matchesGlob } from "./glob";
import { GitHubError, type HttpDeps, rest } from "./http";

export interface TreeEntry {
  path: RepoPath;
  type: "blob" | "tree";
  sha: string;
}

interface GitTreeResponse {
  tree: { path: string; type: string; sha: string }[];
  truncated: boolean;
}

// One recursive git-trees request lists the whole repo, cheap on rate limit. The
// tradeoff is the follow-up: each matched MDX file is a separate blob fetch (see
// loadEntries). GitHub caps the recursive tree at 100k entries / 7MB and signals
// `truncated`; a partial listing would silently hide content, so we refuse it.
export async function listTree(deps: HttpDeps, repo: RepoRef): Promise<TreeEntry[]> {
  const res = await rest<GitTreeResponse>(
    deps,
    "GET",
    `/repos/${repo.owner}/${repo.repo}/git/trees/${repo.branch}?recursive=1`,
  );
  if (res.truncated) {
    throw new GitHubError(
      0,
      "git tree truncated: repo too large for the recursive trees API — escalate to paginated subtree listing",
    );
  }
  return res.tree
    .filter((e) => e.type === "blob" || e.type === "tree")
    .map((e) => ({
      path: e.path as RepoPath,
      type: e.type as "blob" | "tree",
      sha: e.sha,
    }));
}

function collectionFor(path: string, collections: CollectionDef[]): string | undefined {
  return collections.find((c) => matchesGlob(path, c.path))?.name;
}

export async function loadEntries(
  deps: HttpDeps,
  readFile: (repo: RepoRef, path: RepoPath) => Promise<string>,
  repo: RepoRef,
  collections: CollectionDef[],
): Promise<CollectionEntry[]> {
  const tree = await listTree(deps, repo);
  const matched = tree.flatMap((e) => {
    if (e.type !== "blob") return [];
    const collection = collectionFor(e.path, collections);
    return collection ? [{ path: e.path, collection }] : [];
  });
  return Promise.all(
    matched.map(async (m) =>
      parseEntry(m.collection, m.path, await readFile(repo, m.path)),
    ),
  );
}
