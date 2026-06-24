import {
  type ComponentMap,
  islandNamesFromHtml,
  renderToHtml,
  wrapIslandComponents,
} from "@nocms/renderer";

export interface Route {
  /** output path, e.g. "/" or "/posts/first" */
  path: string;
  mdx: string;
  data?: Record<string, unknown>;
}

export interface PrerenderOptions {
  components?: ComponentMap;
  /** CSS injected into <head>, e.g. token custom properties */
  css?: string;
  /** Raw HTML appended to <head>, e.g. a favicon link respecting `base`. */
  head?: string;
  title?: (route: Route) => string;
  /** Registry names that hydrate as islands; their roots get prerender markers. */
  islands?: string[];
  /**
   * URL of the island client bundle. A `<script type="module">` for it is injected
   * only into pages that actually contain an island, so island-free pages ship no JS.
   */
  islandClientSrc?: string;
}

export interface PrerenderedPage {
  path: string;
  html: string;
  /** island names present on this page — the per-page manifest read back from markers */
  islands: string[];
}

function document(
  bodyHtml: string,
  title: string,
  css?: string,
  head?: string,
  script?: string,
): string {
  const style = css ? `<style>${css}</style>` : "";
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/>` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"/>` +
    `<title>${title}</title>${head ?? ""}${style}</head>` +
    `<body><div id="app">${bodyHtml}</div>${script ?? ""}</body></html>`
  );
}

/**
 * Prerender each route to a complete static HTML document using the one renderer. Island
 * components are wrapped so their roots carry hydration markers + serialized props, and the
 * per-page island set is read back from the emitted markers; island-free pages stay
 * byte-for-byte identical to the static-only output (no markers, no script). The
 * file-emission and asset wiring is layered on top; this is the pure content→HTML core.
 */
export async function prerenderRoutes(
  routes: Route[],
  options: PrerenderOptions = {},
): Promise<PrerenderedPage[]> {
  const base = options.components ?? {};
  const components = options.islands?.length
    ? wrapIslandComponents(base, options.islands)
    : base;
  return Promise.all(
    routes.map(async (route) => {
      const body = await renderToHtml({ mdx: route.mdx, components, data: route.data });
      const islands = islandNamesFromHtml(body);
      const title = options.title?.(route) ?? String(route.data?.title ?? route.path);
      const script =
        islands.length && options.islandClientSrc
          ? `<script type="module" src="${options.islandClientSrc}"></script>`
          : undefined;
      return {
        path: route.path,
        html: document(body, title, options.css, options.head, script),
        islands,
      };
    }),
  );
}
