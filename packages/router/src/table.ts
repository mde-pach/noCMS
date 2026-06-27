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

export interface RouteTable<T = unknown> {
  routes: CompiledRoute<T>[];
}

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

export function routeTableFromEntries(
  entries: CollectionEntry[],
): RouteTable<CollectionEntry> {
  return createRouteTable(
    entries.map((entry) => ({ path: contentPathToRoute(entry.path), data: entry })),
  );
}

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
