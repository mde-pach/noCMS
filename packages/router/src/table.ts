// The pure route model: a table of route patterns and a matcher resolving a URL
// pathname to a route + captured params. No DOM, no History — plain functions.

import {
  type CollectionEntry,
  contentPathToRoute,
  normalizeRoutePath,
  type RoutePath,
} from "@nocms/core";

interface Segment {
  /** `true` for a `:name` capture, `false` for a literal segment. */
  param: boolean;
  /** segment text, or the param name (without the leading `:`). */
  name: string;
}

/** A route the host registers: a path pattern plus an arbitrary payload. */
export interface RouteDef<T = unknown> {
  /** Route pattern, e.g. `/about` or `/posts/:slug`. */
  path: RoutePath | string;
  data: T;
}

interface CompiledRoute<T> {
  path: RoutePath;
  segments: Segment[];
  /** Fewer params = more specific; matched first so static beats `:param`. */
  paramCount: number;
  data: T;
}

/** A compiled, ordered set of routes ready to match against. */
export interface RouteTable<T = unknown> {
  routes: CompiledRoute<T>[];
}

/** A successful match: the route, the captured params, and the matched path. */
export interface RouteMatch<T = unknown> {
  route: RouteDef<T>;
  params: Record<string, string>;
  path: RoutePath;
}

function compileSegments(path: RoutePath): Segment[] {
  return normalizeRoutePath(path)
    .split("/")
    .filter(Boolean)
    .map((seg) =>
      seg.startsWith(":")
        ? { param: true, name: seg.slice(1) }
        : { param: false, name: seg },
    );
}

/** Build a table from explicit route definitions (the general form). */
export function createRouteTable<T>(defs: RouteDef<T>[]): RouteTable<T> {
  const routes = defs.map((def) => {
    const path = normalizeRoutePath(def.path);
    const segments = compileSegments(path);
    return {
      path,
      segments,
      paramCount: segments.filter((s) => s.param).length,
      data: def.data,
    };
  });
  routes.sort(
    (a, b) => a.paramCount - b.paramCount || b.segments.length - a.segments.length,
  );
  return { routes };
}

/** Build a table from content entries; each entry's route maps to the entry. */
export function routeTableFromEntries(
  entries: CollectionEntry[],
): RouteTable<CollectionEntry> {
  return createRouteTable(
    entries.map((entry) => ({ path: contentPathToRoute(entry.path), data: entry })),
  );
}

/** Build a table from raw route paths; each route's payload is its own path. */
export function routeTableFromPaths(
  paths: (RoutePath | string)[],
): RouteTable<RoutePath> {
  return createRouteTable(
    paths.map((path) => {
      const normalized = normalizeRoutePath(path);
      return { path: normalized, data: normalized };
    }),
  );
}

/** Drop a deployment base prefix (`/repo/`) from a pathname, if present. */
function stripBase(pathname: string, base: string): string {
  const prefix = (base.endsWith("/") ? base : `${base}/`).replace(/\/$/, "");
  if (!prefix || !pathname.startsWith(prefix)) return pathname;
  const rest = pathname.slice(prefix.length);
  return rest === "" || rest.startsWith("/") ? rest : pathname;
}

function matchSegments(
  segments: Segment[],
  parts: string[],
): Record<string, string> | null {
  if (segments.length !== parts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    const part = parts[i]!;
    if (seg.param) params[seg.name] = decodeURIComponent(part);
    else if (seg.name !== part) return null;
  }
  return params;
}

/**
 * Resolve a URL pathname to a route. Strips `base` first (so a project-Pages
 * deployment matches), normalizes trailing slashes, and returns the most
 * specific match (static segments beat `:param`), or `null` for not-found.
 */
export function matchRoute<T>(
  table: RouteTable<T>,
  pathname: string,
  base = "/",
): RouteMatch<T> | null {
  const path = normalizeRoutePath(stripBase(pathname, base));
  const parts = path.split("/").filter(Boolean);
  for (const route of table.routes) {
    const params = matchSegments(route.segments, parts);
    if (params) return { route: { path: route.path, data: route.data }, params, path };
  }
  return null;
}
