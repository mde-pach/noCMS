import type { CollectionEntry, FeedConfig, SiteConfig } from "@nocms/core";
import { runFeed } from "./feed";
import { runI18n } from "./i18n";
import { runManifest } from "./manifest";
import { runSearch } from "./search";
import { runSitemap } from "./sitemap";

export interface DeriveInput {
  entries: CollectionEntry[];
  locales?: string[];
  /**
   * The deployed site origin including any project-Pages base, e.g.
   * `https://owner.github.io/repo/`. Sitemap and feed need it for absolute URLs;
   * absent, those jobs are skipped.
   */
  siteUrl?: string;
  /** Feed config; the feed job is a no-op unless this and `siteUrl` are both set. */
  feed?: FeedConfig;
}

export type { FeedConfig } from "@nocms/core";

export interface DerivedArtifact {
  path: string;
  contents: string;
}

export interface DeriveJob {
  name: string;
  run(input: DeriveInput): DerivedArtifact[] | Promise<DerivedArtifact[]>;
}

export const manifestJob: DeriveJob = { name: "manifest", run: runManifest };

export const searchJob: DeriveJob = { name: "search", run: runSearch };

export const sitemapJob: DeriveJob = { name: "sitemap", run: runSitemap };

export const i18nJob: DeriveJob = { name: "i18n", run: runI18n };

export const feedJob: DeriveJob = { name: "feed", run: runFeed };

// sitemap/i18n/feed are no-ops when their config (siteUrl, locales, feed) is absent,
// so they stay in the default list unconditionally.
export const jobs: DeriveJob[] = [manifestJob, searchJob, sitemapJob, i18nJob, feedJob];

export async function deriveAll(input: DeriveInput): Promise<DerivedArtifact[]> {
  const out: DerivedArtifact[] = [];
  for (const job of jobs) out.push(...(await job.run(input)));
  return out;
}

export function deriveInputFromConfig(
  config: SiteConfig,
  entries: CollectionEntry[],
): DeriveInput {
  return {
    entries,
    locales: config.locales,
    siteUrl: config.siteUrl,
    feed: config.feed,
  };
}

export {
  buildFeed,
  type JsonFeed,
  type JsonFeedItem,
  toFeedItem,
} from "./feed";
export {
  buildBundles,
  buildTranslations,
  type I18nBundle,
  type I18nBundleEntry,
  type TranslationGroup,
  type TranslationsManifest,
} from "./i18n";
export { buildManifest, type Manifest, type ManifestEntry } from "./manifest";
export {
  buildSearchIndex,
  plainText,
  SEARCH_OPTIONS,
  type SearchDocument,
  toSearchDocument,
} from "./search";
export { buildSitemap, sitemapUrls } from "./sitemap";
