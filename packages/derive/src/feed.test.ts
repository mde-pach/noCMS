import type { CollectionEntry, RepoPath } from "@nocms/core";
import { describe, expect, it } from "vitest";
import { buildFeed, type JsonFeed, runFeed, toFeedItem } from "./feed";
import { deriveAll, type FeedConfig } from "./index";

const post = (
  path: string,
  data: Record<string, unknown> = {},
  body = "",
): CollectionEntry => ({
  collection: "posts",
  path: path as RepoPath,
  data,
  body,
});

const config: FeedConfig = { collections: ["posts"], title: "My Blog" };
const site = "https://example.com/";

describe("buildFeed", () => {
  it("orders items by date descending", () => {
    const feed = buildFeed(
      [
        post("content/posts/old.mdx", { date: "2026-01-01" }),
        post("content/posts/new.mdx", { date: "2026-06-01" }),
        post("content/posts/mid.mdx", { date: "2026-03-01" }),
      ],
      site,
      config,
    );
    expect(feed.items.map((i) => i.url)).toEqual([
      "https://example.com/posts/new",
      "https://example.com/posts/mid",
      "https://example.com/posts/old",
    ]);
  });

  it("sorts dateless items last, then by URL for determinism", () => {
    const feed = buildFeed(
      [
        post("content/posts/z.mdx"),
        post("content/posts/dated.mdx", { date: "2026-01-01" }),
        post("content/posts/a.mdx"),
      ],
      site,
      config,
    );
    expect(feed.items.map((i) => i.url)).toEqual([
      "https://example.com/posts/dated",
      "https://example.com/posts/a",
      "https://example.com/posts/z",
    ]);
  });

  it("includes only configured collections", () => {
    const entries: CollectionEntry[] = [
      post("content/posts/a.mdx", { date: "2026-01-01" }),
      { ...post("content/pages/about.mdx"), collection: "pages" },
    ];
    const feed = buildFeed(entries, site, config);
    expect(feed.items.map((i) => i.url)).toEqual(["https://example.com/posts/a"]);
  });

  it("sets feed metadata and absolute feed/home URLs", () => {
    const feed = buildFeed([], site, { ...config, description: "Thoughts" });
    expect(feed.version).toBe("https://jsonfeed.org/version/1.1");
    expect(feed.title).toBe("My Blog");
    expect(feed.description).toBe("Thoughts");
    expect(feed.home_page_url).toBe("https://example.com/");
    expect(feed.feed_url).toBe("https://example.com/feed.json");
  });

  it("preserves a project-Pages base segment in item URLs", () => {
    const feed = buildFeed(
      [post("content/posts/a.mdx", { date: "2026-01-01" })],
      "https://o.github.io/repo/",
      config,
    );
    expect(feed.items[0]?.url).toBe("https://o.github.io/repo/posts/a");
  });
});

describe("toFeedItem", () => {
  it("derives title, summary, content, and id from frontmatter and body", () => {
    const item = toFeedItem(
      post(
        "content/posts/a.mdx",
        { title: "Hello", summary: "A greeting", date: "2026-06-01" },
        "# Hi\n\nSome **body** text.",
      ),
      site,
    );
    expect(item.id).toBe("https://example.com/posts/a");
    expect(item.url).toBe("https://example.com/posts/a");
    expect(item.title).toBe("Hello");
    expect(item.summary).toBe("A greeting");
    expect(item.date_published).toBe("2026-06-01T00:00:00.000Z");
    expect(item.content_text).toBe("Hi Some body text.");
  });

  it("falls back to the filename for a missing title", () => {
    expect(toFeedItem(post("content/posts/my-post.mdx"), site).title).toBe("my-post");
  });

  it("falls back to description when summary is absent", () => {
    const item = toFeedItem(post("content/posts/a.mdx", { description: "Desc" }), site);
    expect(item.summary).toBe("Desc");
  });

  it("omits date_published for a missing or unparseable date", () => {
    expect(
      toFeedItem(post("content/posts/a.mdx"), site).date_published,
    ).toBeUndefined();
    expect(
      toFeedItem(post("content/posts/a.mdx", { date: "not a date" }), site)
        .date_published,
    ).toBeUndefined();
  });
});

describe("runFeed", () => {
  it("emits feed.json with a trailing newline when configured", () => {
    const artifacts = runFeed({
      entries: [post("content/posts/a.mdx", { date: "2026-01-01" })],
      siteUrl: site,
      feed: config,
    });
    expect(artifacts.map((a) => a.path)).toEqual(["feed.json"]);
    expect(artifacts[0]?.contents.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(artifacts[0]?.contents ?? "") as JsonFeed;
    expect(parsed.items).toHaveLength(1);
  });

  it("is a no-op without a site URL or a feed config", () => {
    const entries = [post("content/posts/a.mdx")];
    expect(runFeed({ entries })).toEqual([]);
    expect(runFeed({ entries, siteUrl: site })).toEqual([]);
    expect(runFeed({ entries, feed: config })).toEqual([]);
  });

  it("runs as part of deriveAll only when both inputs are present", async () => {
    const entries = [post("content/posts/a.mdx", { date: "2026-01-01" })];
    const without = await deriveAll({ entries, siteUrl: site });
    expect(without.some((a) => a.path === "feed.json")).toBe(false);

    const withFeed = await deriveAll({ entries, siteUrl: site, feed: config });
    expect(withFeed.some((a) => a.path === "feed.json")).toBe(true);
  });
});
