// The canonical content-path ↔ route mapping. Build (③), derive (②), and the
// client router (①) all need it, so it lives here in the shared vocabulary.

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
 * Map a content file to its route. Accepts a full repo path (`content/posts/a.mdx`)
 * or a path already relative to `content/`. Strips the extension, collapses a
 * trailing `index` segment, and roots the result:
 * `content/index.mdx → /`, `content/posts/a.mdx → /posts/a`,
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
