import { useEffect, useState } from "preact/hooks";
import * as v from "valibot";
import { readSiteRuntime } from "../site-runtime";

// The JSON Feed item fields this component reads. A minimal structural shape (not the full
// `@nocms/derive` `JsonFeedItem`) so the reader bundle never pulls in the ② tier.
interface FeedItem {
  url: string;
  title: string;
  summary?: string;
  date_published?: string;
}

export const LatestPostsSchema = v.object({
  /** how many items to show */
  limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(20)), 5),
  /** heading above the list */
  title: v.optional(v.string(), "Latest"),
});

export type LatestPostsProps = v.InferInput<typeof LatestPostsSchema>;

// A runtime consumer of the ② feed artifact: it fetches `feed.json` (located via the embedded
// site-runtime config) and lists the most recent items. An island because it fetches at view
// time; it renders nothing until a feed is present.
export function LatestPosts({ limit = 5, title = "Latest" }: LatestPostsProps) {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    const runtime = readSiteRuntime();
    if (!runtime?.feedUrl) return;
    let cancelled = false;
    fetch(runtime.feedUrl)
      .then((res) => (res.ok ? (res.json() as Promise<{ items?: FeedItem[] }>) : null))
      .then((feed) => {
        if (!cancelled && feed?.items) setItems(feed.items.slice(0, limit));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (!items.length) return null;
  return (
    <section class="latest-posts">
      {title ? <h2 style={{ fontFamily: "var(--font-heading)" }}>{title}</h2> : null}
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "grid",
          gap: "var(--space-md)",
        }}
      >
        {items.map((item) => (
          <li key={item.url}>
            <a href={item.url} style={{ fontWeight: 600, color: "var(--color-text)" }}>
              {item.title}
            </a>
            {item.date_published ? (
              <time
                dateTime={item.date_published}
                style={{ opacity: 0.6, marginLeft: "0.5rem" }}
              >
                {item.date_published.slice(0, 10)}
              </time>
            ) : null}
            {item.summary ? (
              <p style={{ margin: "0.25rem 0 0" }}>{item.summary}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
