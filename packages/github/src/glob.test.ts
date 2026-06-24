import { describe, expect, it } from "vitest";
import { matchesGlob } from "./glob";

describe("matchesGlob", () => {
  it("matches `**/*.mdx` across nested segments", () => {
    const g = "content/**/*.mdx";
    expect(matchesGlob("content/index.mdx", g)).toBe(true);
    expect(matchesGlob("content/posts/a.mdx", g)).toBe(true);
    expect(matchesGlob("content/posts/sub/a.mdx", g)).toBe(true);
  });

  it("anchors and respects the extension", () => {
    const g = "content/**/*.mdx";
    expect(matchesGlob("content/index.md", g)).toBe(false);
    expect(matchesGlob("public/content/index.mdx", g)).toBe(false);
    expect(matchesGlob("content/index.mdx.bak", g)).toBe(false);
  });

  it("keeps `*` within a single segment", () => {
    const g = "content/posts/*.mdx";
    expect(matchesGlob("content/posts/a.mdx", g)).toBe(true);
    expect(matchesGlob("content/posts/sub/a.mdx", g)).toBe(false);
  });

  it("scopes a glob to its collection prefix", () => {
    const g = "content/posts/**/*.mdx";
    expect(matchesGlob("content/posts/a.mdx", g)).toBe(true);
    expect(matchesGlob("content/pages/a.mdx", g)).toBe(false);
  });

  it("treats dots as literals, not regex wildcards", () => {
    expect(matchesGlob("content/axmdx", "content/*.mdx")).toBe(false);
  });
});
