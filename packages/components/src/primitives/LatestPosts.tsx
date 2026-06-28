import { useEffect, useState } from "preact/hooks";
import * as v from "valibot";
import { cx } from "../cx";
import { readSiteRuntime } from "../site-runtime";

// A minimal structural shape (not the full `@nocms/derive` `JsonFeedItem`) so the reader
// bundle never pulls in the ② tier.
interface FeedItem {
  url: string;
  title: string;
  summary?: string;
  date_published?: string;
}

export const LatestPostsSchema = v.object({
  limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(20)), 5),
  title: v.optional(v.string(), "Latest"),
});

export type LatestPostsProps = v.InferInput<typeof LatestPostsSchema> & {
  class?: string;
  className?: string;
};

// An island because it fetches the ② feed artifact at view time; it renders nothing until a
// feed is present.
export function LatestPosts({
  limit = 5,
  title = "Latest",
  class: cls,
  className,
}: LatestPostsProps) {
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
    <section class={cx(className, cls)}>
      {title ? <h2 class="font-heading">{title}</h2> : null}
      <ul class="list-none p-0 grid gap-md">
        {items.map((item) => (
          <li key={item.url}>
            <a href={item.url} class="font-semibold text-text">
              {item.title}
            </a>
            {item.date_published ? (
              <time dateTime={item.date_published} class="opacity-60 ml-2">
                {item.date_published.slice(0, 10)}
              </time>
            ) : null}
            {item.summary ? <p class="mt-1 mx-0 mb-0">{item.summary}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
