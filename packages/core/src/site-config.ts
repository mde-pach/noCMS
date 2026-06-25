import * as v from "valibot";

// The site-config seam: the one place a site declares its deployment-wide knobs that
// every tier needs to agree on — the deployment `base`, the absolute `siteUrl`, the
// `locales` in scope (locales[0] is the default), and the syndication `feed`. Build
// (③), derive (②), and the runtime (①) all read it, so per the invariant "if two
// packages need the same thing it belongs in core" it lives here in the shared
// vocabulary, validated with valibot exactly like a collection definition.
//
// Config is small, flat, machine-read, and rarely edited, so it is structured JSON
// validated by valibot — not a flat token-style text file. The text-not-JSON invariant
// scopes to layout and tokens (large, line-merged by hand); config is neither.

/** Which collections syndicate, and the feed's own metadata. */
export interface FeedConfig {
  /** Collections to include; entries from other collections are excluded. */
  collections: string[];
  /** Feed title, e.g. the site name. */
  title: string;
  description?: string;
}

export interface SiteConfig {
  /** Deployment base path, e.g. `/<repo>/` for project Pages, `/` for a custom domain. */
  base: string;
  /**
   * Absolute deployed origin (with any base), e.g. `https://owner.github.io/repo/`.
   * Required for the sitemap and feed, which emit absolute URLs.
   */
  siteUrl?: string;
  /** Locales in scope; `locales[0]` is the default (authored at the content root). */
  locales?: string[];
  feed?: FeedConfig;
}

/**
 * The runtime config the build embeds in each page as `<script id="nocms-site">` so ①
 * consumers can locate the ② derived files served at the site root, without hardcoding the
 * deployment base. URLs are base-relative (ready for `fetch`); fields are present only when
 * the corresponding artifact is produced.
 */
export interface SiteRuntime {
  base: string;
  feedUrl?: string;
  translationsUrl?: string;
}

/** The DOM id of the embedded `SiteRuntime` JSON script. */
export const SITE_RUNTIME_ID = "nocms-site";

const FeedConfigSchema: v.GenericSchema<FeedConfig> = v.object({
  collections: v.pipe(v.array(v.string()), v.minLength(1)),
  title: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
});

const SiteConfigSchema = v.object({
  base: v.optional(v.string()),
  siteUrl: v.optional(v.pipe(v.string(), v.url())),
  locales: v.optional(v.pipe(v.array(v.string()), v.minLength(1))),
  feed: v.optional(FeedConfigSchema),
});

const CONFIG_FILE = "nocms.config.json";

/** Validate raw config (e.g. parsed `nocms.config.json`); fills `base` to `/`. */
export function parseSiteConfig(input: unknown): SiteConfig {
  const { base, ...rest } = v.parse(SiteConfigSchema, input);
  return { base: base ?? "/", ...rest };
}

/**
 * Load `nocms.config.json` from a site root, or the zero-config default (`base: "/"`)
 * when absent — a minimal site needs no config file. Node-only (fs is dynamically
 * imported so this module stays browser-safe for runtime consumers of the rest of core).
 */
export async function loadSiteConfig(root: string): Promise<SiteConfig> {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  let raw: string;
  try {
    raw = await readFile(join(root, CONFIG_FILE), "utf8");
  } catch {
    return parseSiteConfig({});
  }
  return parseSiteConfig(JSON.parse(raw));
}
