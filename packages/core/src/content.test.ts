import { describe, expect, it } from "vitest";
import type { RepoPath } from "./index";
import { parseEntry, parseFrontmatter } from "./index";

describe("parseFrontmatter", () => {
  it("splits YAML front-matter from the body", () => {
    const { data, body } = parseFrontmatter(
      "---\ntitle: Hello\ndraft: true\n---\n\n# Body\n",
    );
    expect(data).toEqual({ title: "Hello", draft: true });
    expect(body).toBe("# Body\n");
  });

  it("returns empty data when there is no front-matter", () => {
    const { data, body } = parseFrontmatter("# Just content");
    expect(data).toEqual({});
    expect(body).toBe("# Just content");
  });

  it("rejects non-mapping front-matter", () => {
    expect(() => parseFrontmatter("---\n- a\n- b\n---\nbody")).toThrow();
  });
});

describe("parseEntry", () => {
  it("builds a collection entry", () => {
    const entry = parseEntry(
      "posts",
      "content/posts/first.mdx" as RepoPath,
      "---\ntitle: First\n---\nHi",
    );
    expect(entry).toEqual({
      collection: "posts",
      path: "content/posts/first.mdx",
      data: { title: "First" },
      body: "Hi",
    });
  });
});
