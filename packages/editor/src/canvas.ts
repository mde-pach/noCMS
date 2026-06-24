// The editor canvas: the live site, rendered by the one renderer, is the editing
// surface. Each element carries a `data-mdx-pos` source offset (renderer editor mode);
// a click walks to the nearest annotated element and resolves that offset back to its
// mdast node, so selection is keyed on source positions — never on matching rendered
// values against the DOM.

import type { ComponentMap } from "@nocms/renderer";
import { renderEditableToVNode } from "@nocms/renderer";
import type { Nodes } from "mdast";
import { render } from "preact";
import { type MdxDocument, parseMdx } from "./mdx-document.js";
import { nodeAtOffset } from "./position.js";

const POS_ATTR = "data-mdx-pos";

export interface CanvasSelection {
  /** source offset of the clicked element's nearest annotated ancestor */
  offset: number;
  /** the most specific mdast node at the offset */
  node: Nodes;
  /** root → deepest chain, for choosing selection granularity */
  path: Nodes[];
}

/** The source offset of the nearest annotated element at or above `el`, if any. */
export function offsetFromElement(el: Element): number | undefined {
  const annotated = el.closest(`[${POS_ATTR}]`);
  const raw = annotated?.getAttribute(POS_ATTR);
  if (raw === null || raw === undefined) return undefined;
  const offset = Number(raw);
  return Number.isNaN(offset) ? undefined : offset;
}

/** Resolve a clicked element to the mdast node that produced it. */
export function selectionAtElement(
  doc: MdxDocument,
  el: Element,
): CanvasSelection | undefined {
  const offset = offsetFromElement(el);
  if (offset === undefined) return undefined;
  const path = nodeAtOffset(doc, offset);
  const node = path.at(-1);
  return node ? { offset, node, path } : undefined;
}

export interface CanvasOptions {
  /** DOM node the canvas renders into */
  target: Element;
  mdx: string;
  /** components MDX tags resolve to */
  components: ComponentMap;
  /** values exposed to the document as props */
  data?: Record<string, unknown>;
  /** called on every canvas click; `undefined` when the click hits no annotated element */
  onSelect?: (selection: CanvasSelection | undefined) => void;
}

export interface CanvasHandle {
  dispose(): void;
}

/**
 * Render the annotated site into `target` and report the selected mdast node on click.
 * The same renderer drives this and publish, so what the canvas shows is what publishes.
 */
export async function mountCanvas(options: CanvasOptions): Promise<CanvasHandle> {
  const doc = parseMdx(options.mdx);
  const tree = await renderEditableToVNode({
    mdx: options.mdx,
    components: options.components,
    data: options.data,
  });
  render(tree, options.target);

  const handleClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    options.onSelect?.(selectionAtElement(doc, target));
  };
  options.target.addEventListener("click", handleClick);

  return {
    dispose() {
      options.target.removeEventListener("click", handleClick);
      render(null, options.target);
    },
  };
}
