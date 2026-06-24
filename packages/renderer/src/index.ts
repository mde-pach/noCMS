// The single rendering engine. The same MDX→Preact tree renders live in the
// editor (browser preview) and prerenders to static HTML at publish, so preview
// and published output cannot diverge. There is exactly one renderer here.

import { type EvaluateOptions, evaluate } from "@mdx-js/mdx";
import { type ComponentType, h, type VNode } from "preact";
import * as jsxRuntime from "preact/jsx-runtime";
import { renderToString } from "preact-render-to-string";

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
const runtime = jsxRuntime as unknown as EvaluateOptions;

/** Compile MDX to a Preact tree (the runtime preview path). */
export async function renderToVNode(input: RenderInput): Promise<VNode> {
  const { default: Content } = (await evaluate(input.mdx, runtime)) as {
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

/** Interactive sub-trees to hydrate as islands after prerender. */
export interface IslandManifest {
  islands: string[];
}

export function collectIslands(_tree: VNode): IslandManifest {
  return { islands: [] };
}
