import {
  type ComponentMap,
  islandNamesFromHtml,
  renderToStaticHtml,
  renderToVNode,
  wrapIslandComponents,
} from "@nocms/renderer";
import { type ComponentChildren, type ComponentType, h } from "preact";

export interface Route {
  path: string;
  mdx: string;
  data?: Record<string, unknown>;
}

export interface PrerenderOptions {
  components?: ComponentMap;
  /** Wraps every route through the one renderer so the published page carries the same shell the editor and reader show; the route's content becomes its children. */
  shell?: ComponentType<{ children?: ComponentChildren; base?: string }>;
  base?: string;
  css?: string;
  head?: string;
  title?: (route: Route) => string;
  /** Registry names to treat as islands; their roots get prerender markers. */
  islands?: string[];
  /** URL of the island client bundle; its `<script>` is injected only into pages with an island, so island-free pages ship no JS. */
  islandClientSrc?: string;
  /**
   * Inlines the page's MDX + tokens + schemas as inert JSON and a bootstrap that lazy-loads the
   * heavy editor bundle only on `?edit`, so readers never download it.
   */
  editor?: {
    clientSrc: string;
    tokens?: string;
    schemas?: Record<string, unknown>;
  };
}

export interface PrerenderedPage {
  path: string;
  html: string;
  islands: string[];
}

function document(
  bodyHtml: string,
  title: string,
  css?: string,
  head?: string,
  scripts?: string,
): string {
  const style = css ? `<style>${css}</style>` : "";
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/>` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"/>` +
    `<title>${title}</title>${head ?? ""}${style}</head>` +
    `<body><div id="app">${bodyHtml}</div>${scripts ?? ""}</body></html>`
  );
}

// The HTML parser reads <script> content as raw text where only `</` can break out, and it won't
// decode HTML entities there — so every `<` is replaced with the JS escape <, which JSON.parse decodes back.
const EDITOR_DATA_ID = "nocms-editor-data";

function editorScripts(
  routeMdx: string,
  editor: NonNullable<PrerenderOptions["editor"]>,
): string {
  const data = JSON.stringify({
    mdx: routeMdx,
    tokens: editor.tokens ?? "",
    schemas: editor.schemas ?? {},
  }).replace(/</g, "\\u003c");
  return (
    `<script type="application/json" id="${EDITOR_DATA_ID}">${data}</script>` +
    `<script type="module">if(new URLSearchParams(location.search).has("edit"))import("${editor.clientSrc}")</script>`
  );
}

/**
 * Renders each route to a full HTML document through the one renderer. Island roots are wrapped
 * with hydration markers + serialized props; island-free pages stay byte-for-byte identical to
 * the static-only output (no markers, no script).
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
      // The shell renders through the same renderer as content, so it can't diverge from the editor/reader.
      const content = await renderToVNode({
        mdx: route.mdx,
        components,
        data: route.data,
      });
      const tree = options.shell
        ? h(options.shell, { base: options.base }, content)
        : content;
      const body = renderToStaticHtml(tree);
      const islands = islandNamesFromHtml(body);
      const title = options.title?.(route) ?? String(route.data?.title ?? route.path);
      const scripts =
        (islands.length && options.islandClientSrc
          ? `<script type="module" src="${options.islandClientSrc}"></script>`
          : "") + (options.editor ? editorScripts(route.mdx, options.editor) : "");
      return {
        path: route.path,
        html: document(body, title, options.css, options.head, scripts || undefined),
        islands,
      };
    }),
  );
}
