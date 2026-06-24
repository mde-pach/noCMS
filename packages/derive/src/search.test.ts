import type { CollectionEntry, RepoPath } from "@nocms/core";
import MiniSearch from "minisearch";
import { describe, expect, it } from "vitest";
import { deriveAll } from "./index";
import {
  buildSearchIndex,
  plainText,
  SEARCH_OPTIONS,
  type SearchDocument,
} from "./search";

const entry = (
  collection: string,
  path: string,
  data: Record<string, unknown>,
  body: string,
): CollectionEntry => ({ collection, path: path as RepoPath, data, body });

describe("plainText", () => {
  it("strips fenced and inline code", () => {
    expect(plainText("text ```js\nconst x = 1\n``` more")).toBe("text more");
    expect(plainText("use `npm` here")).toBe("use here");
  });

  it("strips JSX tags and expressions but keeps prose", () => {
    expect(plainText('hi <Badge variant="new">label</Badge> there')).toBe(
      "hi label there",
    );
    expect(plainText("value {user.name} end")).toBe("value end");
  });

  it("keeps link text and drops the url", () => {
    expect(plainText("see [the docs](https://x.dev/a) now")).toBe("see the docs now");
    expect(plainText("![a cat](/cat.png)")).toBe("a cat");
  });

  it("drops heading and emphasis markers", () => {
    expect(plainText("# Title\n\nsome **bold** and _em_ words")).toContain("Title");
    expect(plainText("# Title")).not.toContain("#");
  });
});

describe("buildSearchIndex", () => {
  const entries = [
    entry(
      "posts",
      "content/posts/cats.mdx",
      { title: "All About Cats" },
      "Cats purr and nap.",
    ),
    entry("posts", "content/posts/dogs.mdx", { title: "Dogs" }, "Dogs bark loudly."),
  ];

  it("finds the matching document and stores display fields", () => {
    const index = buildSearchIndex(entries);
    const results = index.search("purr");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      path: "content/posts/cats.mdx",
      title: "All About Cats",
    });
    expect(results[0]?.excerpt).toBe("Cats purr and nap.");
  });

  it("matches the title as well as the body", () => {
    const index = buildSearchIndex(entries);
    const paths = index.search("dogs").map((r) => r.path);
    expect(paths).toContain("content/posts/dogs.mdx");
  });

  it("supports prefix and fuzzy queries (the point of a real engine)", () => {
    const index = buildSearchIndex(entries);
    expect(index.search("pur", { prefix: true }).map((r) => r.path)).toContain(
      "content/posts/cats.mdx",
    );
    expect(index.search("bark", { fuzzy: 0.3 }).map((r) => r.path)).toContain(
      "content/posts/dogs.mdx",
    );
  });

  it("derives a title from the filename when frontmatter has none", () => {
    const index = buildSearchIndex([
      entry("pages", "content/pages/about.mdx", {}, "hello world"),
    ]);
    expect(index.search("hello")[0]?.title).toBe("about");
  });
});

describe("deriveAll → search.json", () => {
  const entries = [
    entry("posts", "content/posts/a.mdx", { title: "Alpha" }, "alpha beta gamma"),
    entry("posts", "content/posts/b.mdx", { title: "Beta" }, "beta delta"),
  ];

  it("emits a serialized index that reloads and queries identically", async () => {
    const artifacts = await deriveAll({ entries });
    const search = artifacts.find((a) => a.path === "search.json");
    expect(search).toBeDefined();

    // The runtime path: fetch the JSON and reload with the shared options.
    const reloaded = MiniSearch.loadJSON<SearchDocument>(
      search?.contents ?? "",
      SEARCH_OPTIONS,
    );
    const results = reloaded.search("beta");
    expect(results.map((r) => r.path).sort()).toEqual([
      "content/posts/a.mdx",
      "content/posts/b.mdx",
    ]);
    // "delta" only in doc b.
    expect(reloaded.search("delta").map((r) => r.path)).toEqual([
      "content/posts/b.mdx",
    ]);
  });
});
