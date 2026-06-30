import { type EvaluateOptions, evaluate } from "@mdx-js/mdx";
import { type ComponentType, h, type VNode } from "preact";
import * as jsxRuntime from "preact/jsx-runtime";
import { renderToString } from "preact-render-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";

export type ComponentMap = Record<string, ComponentType<Record<string, unknown>>>;

export interface RenderInput {
  mdx: string;
  components: ComponentMap;
  data?: Record<string, unknown>;
}

type MDXContent = ComponentType<
  { components?: ComponentMap } & Record<string, unknown>
>;

// remark-frontmatter keeps leading `---` blocks from rendering as content (collection `data`
// arrives separately); remark-gfm renders the GFM constructs the editor can produce — strikethrough,
// task lists, tables — so preview and publish match what the prose tools write. Built lazily so a
// consumer importing only the hydration seam tree-shakes the MDX compiler + remark stack out instead
// of pulling them in via a module-level const.
function evaluateOptions(): EvaluateOptions {
  return {
    ...(jsxRuntime as unknown as EvaluateOptions),
    remarkPlugins: [remarkFrontmatter, remarkGfm],
  };
}

export async function renderToVNode(input: RenderInput): Promise<VNode> {
  const { default: Content } = (await evaluate(input.mdx, evaluateOptions())) as {
    default: MDXContent;
  };
  return h(Content, { components: input.components, ...input.data });
}

// The only HTML-emitting seam, so the build tier and the editor share one renderer.
export function renderToStaticHtml(tree: VNode): string {
  return renderToString(tree);
}

export async function renderToHtml(input: RenderInput): Promise<string> {
  return renderToStaticHtml(await renderToVNode(input));
}

export {
  collectIslands,
  deserializeIslandProps,
  hydrateIslands,
  type IdentifyIsland,
  ISLAND_ATTR,
  ISLAND_PROPS_ATTR,
  type IslandInstance,
  type IslandManifest,
  islandNamesFromHtml,
  serializeIslandProps,
  wrapIslandComponents,
} from "./islands.js";
