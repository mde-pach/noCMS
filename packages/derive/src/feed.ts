import { type CollectionEntry, contentPathToRoute } from "@nocms/core";
import type { DerivedArtifact, DeriveInput, FeedConfig } from "./index";
import { plainText } from "./search";

// JSON Feed rather than RSS/Atom XML: the runtime reads it with plain fetch +
// JSON.parse, and JSON.stringify sidesteps the XML-escaping and RFC-822 date
// pitfalls of hand-emitting RSS/Atom.

const VERSION = "https://jsonfeed.org/version/1.1";
const FEED_PATH = "feed.json";

export interface JsonFeedItem {
  id: string;
  url: string;
  title: string;
  content_text: string;
  summary?: string;
  date_published?: string;
}

export interface JsonFeed {
  version: string;
  title: string;
  description?: string;
  home_page_url: string;
  feed_url: string;
  items: JsonFeedItem[];
}

function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function absoluteUrl(entry: CollectionEntry, base: string): string {
  const route = contentPathToRoute(entry.path).replace(/^\//, "");
  return new URL(route, base).href;
}

function titleOf(entry: CollectionEntry): string {
  const title = entry.data.title;
  if (typeof title === "string" && title.trim()) return title;
  const base = entry.path.split("/").pop() ?? entry.path;
  return base.replace(/\.mdx?$/, "");
}

function firstString(
  data: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

// Frontmatter dates may be ISO strings or Date values (some loaders coerce YAML
// dates). An unparseable or absent date yields no published date and sorts last.
function publishedAt(data: Record<string, unknown>): { iso?: string; time: number } {
  const raw = data.date ?? data.published;
  if (typeof raw !== "string" && !(raw instanceof Date)) return { time: -Infinity };
  const date = raw instanceof Date ? raw : new Date(raw);
  const time = date.getTime();
  if (Number.isNaN(time)) return { time: -Infinity };
  return { iso: date.toISOString(), time };
}

export function toFeedItem(entry: CollectionEntry, base: string): JsonFeedItem {
  const url = absoluteUrl(entry, base);
  const { iso } = publishedAt(entry.data);
  const item: JsonFeedItem = {
    id: url,
    url,
    title: titleOf(entry),
    content_text: plainText(entry.body),
  };
  const summary = firstString(entry.data, ["summary", "description"]);
  if (summary) item.summary = summary;
  if (iso) item.date_published = iso;
  return item;
}

export function buildFeed(
  entries: CollectionEntry[],
  siteUrl: string,
  config: FeedConfig,
): JsonFeed {
  const base = withTrailingSlash(siteUrl);
  const included = entries.filter((e) => config.collections.includes(e.collection));
  const ordered = included
    .map((entry) => ({ entry, time: publishedAt(entry.data).time }))
    .sort(
      (a, b) =>
        b.time - a.time ||
        absoluteUrl(a.entry, base).localeCompare(absoluteUrl(b.entry, base)),
    )
    .map(({ entry }) => toFeedItem(entry, base));
  const feed: JsonFeed = {
    version: VERSION,
    title: config.title,
    home_page_url: base,
    feed_url: new URL(FEED_PATH, base).href,
    items: ordered,
  };
  if (config.description) feed.description = config.description;
  return feed;
}

export function runFeed(input: DeriveInput): DerivedArtifact[] {
  if (!input.siteUrl || !input.feed) return [];
  const feed = buildFeed(input.entries, input.siteUrl, input.feed);
  return [{ path: FEED_PATH, contents: `${JSON.stringify(feed, null, 2)}\n` }];
}
