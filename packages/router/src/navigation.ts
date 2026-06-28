// An optional progressive enhancement: without it, links are real page loads against
// prerendered HTML. DOM/History access is injected so the table logic stays testable.

import { matchRoute, type RouteMatch, type RouteTable } from "./table";

export interface NavigationOptions {
  /** Deployment base, e.g. `/<repo>/` for project Pages. */
  base?: string;
  /** The window to bind to; defaults to the global. Injected for testing. */
  window?: Window;
}

export interface Navigation<T> {
  current(): RouteMatch<T> | null;
  /** Soft-navigate to a path/href, resolved relative to the current location. */
  navigate(to: string, options?: { replace?: boolean }): void;
  subscribe(listener: (match: RouteMatch<T> | null) => void): () => void;
  destroy(): void;
}

function interceptableUrl(event: MouseEvent, win: Window): URL | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const target = event.target as Element | null;
  const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
  if (!anchor) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  if (anchor.getAttribute("rel")?.split(/\s+/).includes("external")) return null;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return null;
  const url = new URL(href, win.location.href);
  return url.origin === win.location.origin ? url : null;
}

// A click to an unmatched same-origin path is left alone, so assets and not-yet-known pages
// fall back to a normal page load.
export function startNavigation<T>(
  table: RouteTable<T>,
  options: NavigationOptions = {},
): Navigation<T> {
  const win = options.window ?? globalThis.window;
  if (!win) throw new Error("startNavigation requires a window (browser-only)");
  const base = options.base ?? "/";
  const listeners = new Set<(match: RouteMatch<T> | null) => void>();
  let currentMatch = matchRoute(table, win.location.pathname, base);

  const update = () => {
    currentMatch = matchRoute(table, win.location.pathname, base);
    for (const listener of listeners) listener(currentMatch);
  };

  const onClick = (event: MouseEvent) => {
    const url = interceptableUrl(event, win);
    if (!url || !matchRoute(table, url.pathname, base)) return;
    event.preventDefault();
    win.history.pushState(null, "", url.pathname + url.search + url.hash);
    update();
  };

  win.addEventListener("click", onClick as EventListener);
  win.addEventListener("popstate", update);

  return {
    current: () => currentMatch,
    navigate: (to, navOptions) => {
      const url = new URL(to, win.location.href);
      const next = url.pathname + url.search + url.hash;
      if (navOptions?.replace) win.history.replaceState(null, "", next);
      else win.history.pushState(null, "", next);
      update();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy: () => {
      win.removeEventListener("click", onClick as EventListener);
      win.removeEventListener("popstate", update);
      listeners.clear();
    },
  };
}
