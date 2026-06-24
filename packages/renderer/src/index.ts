// The single rendering engine. The same MDX→Preact tree renders live in the
// editor (browser preview) and prerenders to static HTML at publish, so preview
// and published output cannot diverge. There is exactly one renderer here.

import { type EvaluateOptions, evaluate } from "@mdx-js/mdx";
import { type ComponentType, h, type VNode } from "preact";
import * as jsxRuntime from "preact/jsx-runtime";
import { renderToString } from "preact-render-to-string";
import remarkFrontmatter from "remark-frontmatter";

/** Components MDX tags resolve to (curated set + plugin packs). */
export type ComponentMap = Record<string, ComponentType<Record<string, unknown>>>;

export interface RenderInput {
  mdx: string;
  components: ComponentMap;
  /** values exposed to the document, available as props */
  data?: Record<string, unknown>;
}

type MDXContent = ComponentType<
  { components?: ComponentMap } & Record<string, unknown>
>;

// preact/jsx-runtime supplies the automatic-runtime functions MDX evaluates
// against; its types are structurally compatible but declared separately.
// remark-frontmatter recognizes leading `---` blocks so they aren't rendered as
// content — collection `data` is supplied separately via `RenderInput.data`.
const options: EvaluateOptions = {
  ...(jsxRuntime as unknown as EvaluateOptions),
  remarkPlugins: [remarkFrontmatter],
};

/** Compile MDX to a Preact tree (the runtime preview path). */
export async function renderToVNode(input: RenderInput): Promise<VNode> {
  const { default: Content } = (await evaluate(input.mdx, options)) as {
    default: MDXContent;
  };
  return h(Content, { components: input.components, ...input.data });
}

// Thin wrapper over preact-render-to-string. This is the only HTML-emitting
// seam, so the build tier and the editor share one renderer.
export function renderToStaticHtml(tree: VNode): string {
  return renderToString(tree);
}

/** Compile MDX straight to static HTML (the publish path = preview path + render). */
export async function renderToHtml(input: RenderInput): Promise<string> {
  return renderToStaticHtml(await renderToVNode(input));
}

export { renderEditableToVNode } from "./editable.js";

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
