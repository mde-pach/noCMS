import type { CollectionEntry, RepoPath } from "@nocms/core";
import { describe, expect, it } from "vitest";
import { deriveAll } from "./index";
import { buildSitemap, runSitemap, sitemapUrls } from "./sitemap";

const entry = (path: string): CollectionEntry => ({
  collection: "pages",
  path: path as RepoPath,
  data: {},
  body: "",
});

const entries = [
  entry("content/index.mdx"),
  entry("content/about.mdx"),
  entry("content/posts/a.mdx"),
  entry("content/posts/index.mdx"),
];

describe("sitemapUrls", () => {
  it("maps each entry to an absolute, sorted URL under the site root", () => {
    expect(sitemapUrls(entries, "https://example.com/")).toEqual([
      "https://example.com/",
      "https://example.com/about",
      "https://example.com/posts",
      "https://example.com/posts/a",
    ]);
  });

  it("preserves a project-Pages base segment", () => {
    expect(
      sitemapUrls([entry("content/posts/a.mdx")], "https://o.github.io/repo/"),
    ).toEqual(["https://o.github.io/repo/posts/a"]);
  });

  it("tolerates a site URL without a trailing slash", () => {
    expect(sitemapUrls([entry("content/index.mdx")], "https://example.com")).toEqual([
      "https://example.com/",
    ]);
  });

  it("dedupes entries that collapse to the same route", () => {
    const dup = [entry("content/posts.mdx"), entry("content/posts/index.mdx")];
    expect(sitemapUrls(dup, "https://example.com/")).toEqual([
      "https://example.com/posts",
    ]);
  });
});

describe("buildSitemap", () => {
  it("produces a valid urlset with one <loc> per route", () => {
    const xml = buildSitemap([entry("content/index.mdx")], "https://example.com/");
    expect(xml).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `  <url>\n    <loc>https://example.com/</loc>\n  </url>\n` +
        `</urlset>\n`,
    );
  });

  it("escapes XML-significant characters in URLs", () => {
    const xml = buildSitemap([entry("content/a&b.mdx")], "https://example.com/");
    expect(xml).toContain("<loc>https://example.com/a&amp;b</loc>");
    expect(xml).not.toContain("a&b");
  });
});

describe("runSitemap", () => {
  it("emits sitemap.xml when a site URL is configured", () => {
    const out = runSitemap({ entries, siteUrl: "https://example.com/" });
    expect(out).toHaveLength(1);
    expect(out[0]?.path).toBe("sitemap.xml");
  });

  it("emits nothing without a site URL", () => {
    expect(runSitemap({ entries })).toEqual([]);
  });

  it("is wired into deriveAll only when configured", async () => {
    const without = await deriveAll({ entries });
    expect(without.some((a) => a.path === "sitemap.xml")).toBe(false);

    const withUrl = await deriveAll({ entries, siteUrl: "https://example.com/" });
    expect(withUrl.some((a) => a.path === "sitemap.xml")).toBe(true);
  });
});
