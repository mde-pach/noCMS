// Pure navigation helpers for rendering menus and page chrome: breadcrumbs and
// active-link detection. DOM-free — they operate on the route table and paths, so
// the runtime can build nav UI without re-deriving the routing convention.

import { href, normalizeRoutePath, type RoutePath } from "@nocms/core";
import { matchRoute, type RouteDef, type RouteTable } from "./table";

export interface Crumb<T> {
  path: RoutePath;
  /** Ready-to-use href, with the deployment base applied. */
  href: string;
  route: RouteDef<T>;
}

/** The route path and each of its ancestors, root-first. */
function ancestors(routePath: RoutePath): RoutePath[] {
  const normalized = normalizeRoutePath(routePath);
  const acc: RoutePath[] = ["/" as RoutePath];
  let current = "";
  for (const part of normalized.split("/").filter(Boolean)) {
    current += `/${part}`;
    acc.push(current as RoutePath);
  }
  return acc;
}

/**
 * The breadcrumb trail for a route: the page and each ancestor that is itself a
 * real route in the table, root-first. Ancestors with no own page (e.g. `/posts`
 * when only `/posts/a` exists) are skipped, so every crumb is a live link.
 */
export function breadcrumbs<T>(
  table: RouteTable<T>,
  routePath: RoutePath | string,
  base = "/",
): Crumb<T>[] {
  const crumbs: Crumb<T>[] = [];
  for (const path of ancestors(normalizeRoutePath(routePath))) {
    const match = matchRoute(table, path);
    if (match) crumbs.push({ path, href: href(path, base), route: match.route });
  }
  return crumbs;
}

/**
 * Whether `target` should render as active given the `current` path. By default a
 * parent is active for its descendants (`/posts` is active on `/posts/a`); with
 * `exact`, only the identical path matches. The root is active only on the root.
 */
export function isActiveRoute(
  current: RoutePath | string,
  target: RoutePath | string,
  options: { exact?: boolean } = {},
): boolean {
  const cur = normalizeRoutePath(current);
  const tgt = normalizeRoutePath(target);
  if (options.exact || tgt === "/") return cur === tgt;
  return cur === tgt || cur.startsWith(`${tgt}/`);
}
