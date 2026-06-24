import type { CollectionEntry, RepoPath } from "@nocms/core";
import { describe, expect, it } from "vitest";
import { buildManifest, deriveAll } from "./index";

const entries: CollectionEntry[] = [
  {
    collection: "posts",
    path: "content/posts/a.mdx" as RepoPath,
    data: { title: "A" },
    body: "# A",
  },
  {
    collection: "posts",
    path: "content/posts/b.mdx" as RepoPath,
    data: { title: "B", draft: true },
    body: "# B",
  },
];

describe("buildManifest", () => {
  it("summarizes entries without the body", () => {
    const manifest = buildManifest(entries);
    expect(manifest.count).toBe(2);
    expect(manifest.entries[0]).toEqual({
      collection: "posts",
      path: "content/posts/a.mdx",
      data: { title: "A" },
    });
    expect(manifest.entries[0]).not.toHaveProperty("body");
  });
});

describe("deriveAll", () => {
  it("emits a manifest.json artifact", async () => {
    const artifacts = await deriveAll({ entries });
    const manifest = artifacts.find((a) => a.path === "manifest.json");
    expect(manifest).toBeDefined();
    expect(JSON.parse(manifest?.contents ?? "{}").count).toBe(2);
  });
});
