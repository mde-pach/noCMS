import { type CollectionEntry, contentPathToRoute, type RoutePath } from "@nocms/core";
import type { DerivedArtifact, DeriveInput } from "./index";

// Per-locale content bundles + a translations manifest, precomputed in the ② tier.
// Content declares a translation by where the file lives: the default locale (the
// first entry in `locales`) is authored at the content root; every other locale
// lives under its own directory (`content/fr/about.mdx`). Two files translate each
// other when their locale-stripped path matches. The locale is thus a structural
// path segment, so routes fall out of core's shared `contentPathToRoute` unchanged
// and the runtime can render a language switcher from a page's other-locale URLs.

const CONTENT_PREFIX = "content/";

/** One entry of a locale's content index. */
export interface I18nBundleEntry {
  /** Canonical, locale-independent key: the default-locale route of this page. */
  key: RoutePath;
  /** The route this localized entry is actually served at (locale-prefixed). */
  route: RoutePath;
  path: string;
  data: Record<string, unknown>;
}

/** One locale's content, the runtime reads to list/render that locale. */
export interface I18nBundle {
  locale: string;
  entries: I18nBundleEntry[];
}

/** A page and the routes of its translations, keyed by locale. */
export interface TranslationGroup {
  key: RoutePath;
  translations: Record<string, RoutePath>;
}

export interface TranslationsManifest {
  defaultLocale: string;
  locales: string[];
  groups: TranslationGroup[];
}

interface Classified {
  locale: string;
  entry: I18nBundleEntry;
}

// Split a content path into (locale, locale-stripped path). The first segment is a
// locale only when it is one of the non-default locales; otherwise the file belongs
// to the default locale and keeps its full path (so a non-locale directory like
// `posts/` is left untouched).
function classify(entry: CollectionEntry, locales: string[]): Classified {
  const defaultLocale = locales[0] as string;
  const nonDefault = locales.slice(1);
  const rel = entry.path.startsWith(CONTENT_PREFIX)
    ? entry.path.slice(CONTENT_PREFIX.length)
    : entry.path;
  const segments = rel.split("/").filter(Boolean);
  const first = segments[0];
  const isLocaleDir = first !== undefined && nonDefault.includes(first);
  const locale = isLocaleDir ? first : defaultLocale;
  const keySource = isLocaleDir ? segments.slice(1) : segments;
  return {
    locale,
    entry: {
      key: contentPathToRoute(`${CONTENT_PREFIX}${keySource.join("/")}`),
      route: contentPathToRoute(entry.path),
      path: entry.path,
      data: entry.data,
    },
  };
}

function byKey(a: { key: RoutePath }, b: { key: RoutePath }): number {
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

export function buildBundles(
  entries: CollectionEntry[],
  locales: string[],
): I18nBundle[] {
  const byLocale = new Map<string, I18nBundleEntry[]>();
  for (const locale of locales) byLocale.set(locale, []);
  for (const entry of entries) {
    const { locale, entry: bundled } = classify(entry, locales);
    (byLocale.get(locale) ?? []).push(bundled);
  }
  return locales.map((locale) => ({
    locale,
    entries: (byLocale.get(locale) ?? []).slice().sort(byKey),
  }));
}

export function buildTranslations(
  entries: CollectionEntry[],
  locales: string[],
): TranslationsManifest {
  const groups = new Map<string, TranslationGroup>();
  for (const entry of entries) {
    const { locale, entry: bundled } = classify(entry, locales);
    const group = groups.get(bundled.key) ?? { key: bundled.key, translations: {} };
    group.translations[locale] = bundled.route;
    groups.set(bundled.key, group);
  }
  return {
    defaultLocale: locales[0] as string,
    locales,
    groups: [...groups.values()].sort(byKey),
  };
}

/**
 * Emit per-locale bundles and a translations manifest, but only when `locales`
 * declares a default plus at least one translation locale; otherwise nothing.
 */
export function runI18n(input: DeriveInput): DerivedArtifact[] {
  const locales = input.locales;
  if (!locales || locales.length < 2) return [];
  const bundles = buildBundles(input.entries, locales).map((bundle) => ({
    path: `i18n/${bundle.locale}.json`,
    contents: `${JSON.stringify(bundle, null, 2)}\n`,
  }));
  const translations = buildTranslations(input.entries, locales);
  return [
    ...bundles,
    {
      path: "i18n/translations.json",
      contents: `${JSON.stringify(translations, null, 2)}\n`,
    },
  ];
}
