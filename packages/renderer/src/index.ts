// The single rendering engine. The same MDX→Preact tree renders live in the
// editor (browser preview) and prerenders to static HTML at publish, so preview
// and published output cannot diverge. There is exactly one renderer here.

import type { ComponentType, VNode } from "preact";
import { renderToString } from "preact-render-to-string";

/** Components MDX tags resolve to (curated set + plugin packs). */
export type ComponentMap = Record<string, ComponentType<Record<string, unknown>>>;

export interface RenderInput {
  mdx: string;
  components: ComponentMap;
  /** collection/front-matter data in scope for the document */
  data?: Record<string, unknown>;
}

/** Compile MDX to a Preact tree (the runtime preview path). */
export async function renderToVNode(_input: RenderInput): Promise<VNode> {
  throw new Error("not implemented: MDX → Preact VNode");
}

// Thin wrapper over preact-render-to-string. This is the only HTML-emitting
// seam, so the build tier and the editor share one renderer.
export function renderToStaticHtml(tree: VNode): string {
  return renderToString(tree);
}

/** Interactive sub-trees to hydrate as islands after prerender. */
export interface IslandManifest {
  islands: string[];
}

export function collectIslands(_tree: VNode): IslandManifest {
  return { islands: [] };
}
