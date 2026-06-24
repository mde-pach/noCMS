import type { CollectionEntry, RepoPath } from "@nocms/core";
import { describe, expect, it } from "vitest";
import { deriveAll } from "./index";
import { buildSearchIndex, plainText, type SearchIndex, tokenize } from "./search";

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

describe("tokenize", () => {
  it("lowercases and splits on non-word characters", () => {
    expect(tokenize("Hello, WORLD! foo-bar")).toEqual(["hello", "world", "foo", "bar"]);
  });

  it("drops single-character tokens", () => {
    expect(tokenize("a ab abc")).toEqual(["ab", "abc"]);
  });

  it("handles unicode letters and digits", () => {
    expect(tokenize("café 2026 naïve")).toEqual(["café", "2026", "naïve"]);
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
    entry(
      "posts",
      "content/posts/dogs.mdx",
      { title: "Dogs" },
      "Dogs bark. Cats and dogs differ.",
    ),
  ];

  it("produces one document per entry with title, path, and excerpt", () => {
    const index = buildSearchIndex(entries);
    expect(index.documents).toHaveLength(2);
    expect(index.documents[0]).toMatchObject({
      id: 0,
      collection: "posts",
      path: "content/posts/cats.mdx",
      title: "All About Cats",
    });
    expect(index.documents[0]?.excerpt).toBe("Cats purr and nap.");
  });

  it("maps a token to every document that contains it, body and title", () => {
    const index = buildSearchIndex(entries);
    // "cats" appears in both bodies and in doc 0's title.
    expect(index.postings.cats).toEqual([0, 1]);
    // "purr" only in doc 0.
    expect(index.postings.purr).toEqual([0]);
    // "bark" only in doc 1.
    expect(index.postings.bark).toEqual([1]);
  });

  it("derives a title from the filename when frontmatter has none", () => {
    const index = buildSearchIndex([
      entry("pages", "content/pages/about.mdx", {}, "hello"),
    ]);
    expect(index.documents[0]?.title).toBe("about");
  });

  it("truncates a long excerpt with an ellipsis", () => {
    const long = "word ".repeat(100);
    const index = buildSearchIndex([
      entry("p", "content/p/x.mdx", { title: "X" }, long),
    ]);
    const excerpt = index.documents[0]?.excerpt ?? "";
    expect(excerpt.length).toBeLessThanOrEqual(201);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("emits postings sorted by token with ascending id lists", () => {
    const index = buildSearchIndex(entries);
    const tokens = Object.keys(index.postings);
    expect(tokens).toEqual([...tokens].sort());
    for (const ids of Object.values(index.postings)) {
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
    }
  });
});

describe("deriveAll", () => {
  it("emits a parseable search.json artifact", async () => {
    const entries = [
      entry("posts", "content/posts/a.mdx", { title: "Alpha" }, "alpha beta"),
    ];
    const artifacts = await deriveAll({ entries });
    const search = artifacts.find((a) => a.path === "search.json");
    expect(search).toBeDefined();
    const index = JSON.parse(search?.contents ?? "{}") as SearchIndex;
    expect(index.documents[0]?.title).toBe("Alpha");
    expect(index.postings.beta).toEqual([0]);
  });
});
