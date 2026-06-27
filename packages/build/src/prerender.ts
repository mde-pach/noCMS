import {
  type ComponentMap,
  islandNamesFromHtml,
  renderToStaticHtml,
  renderToVNode,
  wrapIslandComponents,
} from "@nocms/renderer";
import { type ComponentChildren, type ComponentType, h } from "preact";

export interface Route {
  /** output path, e.g. "/" or "/posts/first" */
  path: string;
  mdx: string;
  data?: Record<string, unknown>;
}

export interface PrerenderOptions {
  components?: ComponentMap;
  /**
   * Optional site shell wrapping every route's content (header/footer/page frame). Rendered by
   * the one renderer, so the published page carries the same shell the editor and reader show —
   * what you edit is what publishes, shell included (D21). The route's content becomes its
   * children; `base` is passed through for nav links.
   */
  shell?: ComponentType<{ children?: ComponentChildren; base?: string }>;
  /** Base path passed to the shell. */
  base?: string;
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
  /**
   * Ships the in-site editor with the static page so `?edit` opens it in the browser. Each
   * page inlines its own MDX source + tokens + schemas as inert JSON, and a tiny bootstrap
   * lazy-loads the (heavy) editor bundle only when `?edit` is present — readers never download
   * it. Editing is in-memory here (no persistence); saving to GitHub is a separate seam.
   */
  editor?: {
    /** URL of the editor client bundle, imported on demand. */
    clientSrc: string;
    /** flat token source the design panel themes from. */
    tokens?: string;
    /** per-component controls, injected (not discovered live in the browser). */
    schemas?: Record<string, unknown>;
  };
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

// JSON safe to embed in a <script>: the HTML parser reads script content as raw text, so the
// only sequence that could break out is `</`. Escaping `<` as < keeps it inert; JSON.parse
// decodes it back. (HTML entities are NOT decoded inside <script>, so they can't be used here.)
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
      // Compile to a tree, optionally wrap in the site shell, then render once — the shell goes
      // through the same renderer as content, so it can't diverge from the editor/reader.
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
