import { type ComponentMap, renderToHtml } from "@nocms/renderer";

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
  title?: (route: Route) => string;
}

export interface PrerenderedPage {
  path: string;
  html: string;
}

function document(bodyHtml: string, title: string, css?: string): string {
  const style = css ? `<style>${css}</style>` : "";
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/>` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"/>` +
    `<title>${title}</title>${style}</head>` +
    `<body><div id="app">${bodyHtml}</div></body></html>`
  );
}

/**
 * Prerender each route to a complete static HTML document using the one renderer.
 * The file-emission, asset, and island-hydration wiring (the full Vite pipeline)
 * is layered on top of this; this is the pure content→HTML core.
 */
export async function prerenderRoutes(
  routes: Route[],
  options: PrerenderOptions = {},
): Promise<PrerenderedPage[]> {
  const components = options.components ?? {};
  return Promise.all(
    routes.map(async (route) => {
      const body = await renderToHtml({ mdx: route.mdx, components, data: route.data });
      const title = options.title?.(route) ?? String(route.data?.title ?? route.path);
      return { path: route.path, html: document(body, title, options.css) };
    }),
  );
}
