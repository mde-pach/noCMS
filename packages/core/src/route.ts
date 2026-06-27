import type { RepoPath } from "./index";

const CONTENT_PREFIX = "content/";

/** A site route path: leading slash, no trailing slash (root is `/`). */
export type RoutePath = string & { readonly __brand: "RoutePath" };

/** Leading slash, trailing slashes collapsed away (root stays `/`). */
export function normalizeRoutePath(path: string): RoutePath {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  const trimmed = withSlash.replace(/\/+$/, "");
  return (trimmed || "/") as RoutePath;
}

/**
 * Map a content file to its route. Accepts a full repo path or a path already
 * relative to `content/`: `content/index.mdx → /`, `content/posts/a.mdx → /posts/a`,
 * `content/posts/index.mdx → /posts`.
 */
export function contentPathToRoute(repoPath: RepoPath | string): RoutePath {
  const rel = repoPath.startsWith(CONTENT_PREFIX)
    ? repoPath.slice(CONTENT_PREFIX.length)
    : repoPath;
  const segments = rel
    .replace(/\.mdx?$/, "")
    .split("/")
    .filter(Boolean);
  if (segments.at(-1) === "index") segments.pop();
  return `/${segments.join("/")}` as RoutePath;
}

/**
 * The canonical content path for a route. The forward mapping is many-to-one
 * (`/posts` ← both `posts.mdx` and `posts/index.mdx`), so the inverse always
 * yields the `index.mdx` form: `/ → content/index.mdx`,
 * `/posts → content/posts/index.mdx`.
 */
export function routeToContentPath(routePath: RoutePath | string): RepoPath {
  const trimmed = normalizeRoutePath(routePath).replace(/^\/+/, "");
  const file = trimmed ? `${trimmed}/index.mdx` : "index.mdx";
  return `${CONTENT_PREFIX}${file}` as RepoPath;
}

/**
 * Resolve a route path against a deployment base (e.g. `/<repo>/` for project
 * Pages, `/` for a custom domain) into an href the browser can navigate.
 */
export function href(routePath: RoutePath | string, base = "/"): string {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const rel = normalizeRoutePath(routePath).replace(/^\/+/, "");
  return `${normalizedBase}${rel}`;
}

/**
 * A browser `location.pathname` (which carries the deployment base) → its base-less
 * route, so a runtime consumer can match the current page against the base-less routes
 * the derived artifacts use. A pathname that does not lie under `base` is returned as-is.
 */
export function routeFromPathname(pathname: string, base = "/"): RoutePath {
  const prefix = (base.endsWith("/") ? base : `${base}/`).replace(/\/$/, "");
  if (prefix && pathname.startsWith(prefix)) {
    const rest = pathname.slice(prefix.length);
    if (rest === "" || rest.startsWith("/")) return normalizeRoutePath(rest || "/");
  }
  return normalizeRoutePath(pathname);
}

/** A page's localized variant: the locale and the route it is served at. */
export interface LocaleLink {
  locale: string;
  route: RoutePath;
  /** Ready-to-use href, with the deployment base applied. */
  href: string;
  current: boolean;
}

/**
 * The minimal shape `localeLinks` reads from the derived i18n translations manifest
 * (`i18n/translations.json`). `@nocms/derive`'s `TranslationsManifest` is structurally
 * assignable to it, so the runtime consumes the artifact without depending on the ② tier.
 */
export interface LocaleManifest {
  /** Locale order, default first — the order links are returned in. */
  locales: string[];
  /** One per page: the routes that translate each other, keyed by locale. */
  groups: { translations: Record<string, string> }[];
}

/**
 * Resolve a language switcher for the page at `currentRoute` from the translations
 * manifest. The locale is a structural leading path segment (the i18n content
 * convention), so each translation is an ordinary route resolved with `href` — no
 * `:lang` matcher or per-locale base needed. Returns `[]` when the route is not part
 * of any translation group.
 */
export function localeLinks(
  manifest: LocaleManifest,
  currentRoute: RoutePath | string,
  base = "/",
): LocaleLink[] {
  const current = normalizeRoutePath(currentRoute);
  const group = manifest.groups.find((g) =>
    Object.values(g.translations).some((r) => normalizeRoutePath(r) === current),
  );
  if (!group) return [];
  return manifest.locales
    .filter((locale) => group.translations[locale] !== undefined)
    .map((locale) => {
      const route = normalizeRoutePath(group.translations[locale] as string);
      return { locale, route, href: href(route, base), current: route === current };
    });
}
