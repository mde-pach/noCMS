// The batch tier: precompute features from the whole corpus in Actions —
// search, i18n, manifests, feeds. Output is just files the site reads at
// runtime. Artifacts are committed off session branches to avoid merge noise.

import type { CollectionEntry } from "@nocms/core";
import { runFeed } from "./feed";
import { runI18n } from "./i18n";
import { runManifest } from "./manifest";
import { runSearch } from "./search";
import { runSitemap } from "./sitemap";

export interface DeriveInput {
  entries: CollectionEntry[];
  /** locales in scope for i18n bundles */
  locales?: string[];
  /**
   * The deployed site origin (with any project-Pages base), e.g.
   * `https://owner.github.io/repo/`. Required for the sitemap job, which emits
   * the absolute URLs the protocol mandates; absent, the sitemap is skipped.
   */
  siteUrl?: string;
  /**
   * Feed configuration. The feed job is a no-op unless this and `siteUrl` are
   * both set (the feed needs absolute item URLs).
   */
  feed?: FeedConfig;
}

/** Which collections syndicate, and the feed's own metadata. */
export interface FeedConfig {
  /** Collections to include; entries from other collections are excluded. */
  collections: string[];
  /** Feed title, e.g. the site name. */
  title: string;
  description?: string;
}

/** A produced file: path plus serialized contents. */
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

// Emits sitemap.xml only when `siteUrl` is set (the protocol needs absolute
// URLs), so it is safe to keep in the default jobs list — a no-op otherwise.
export const sitemapJob: DeriveJob = { name: "sitemap", run: runSitemap };

// Emits per-locale bundles + a translations manifest only when `locales` declares
// a default plus at least one translation locale, so it is safe in the jobs list.
export const i18nJob: DeriveJob = { name: "i18n", run: runI18n };

// Emits feed.json only when both `siteUrl` and a `feed` config are set (the feed
// needs absolute item URLs), so it is safe in the jobs list — a no-op otherwise.
export const feedJob: DeriveJob = { name: "feed", run: runFeed };

/** The jobs that run today. */
export const jobs: DeriveJob[] = [manifestJob, searchJob, sitemapJob, i18nJob, feedJob];

export async function deriveAll(input: DeriveInput): Promise<DerivedArtifact[]> {
  const out: DerivedArtifact[] = [];
  for (const job of jobs) out.push(...(await job.run(input)));
  return out;
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
