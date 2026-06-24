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
import { nodeAtIndexPath, nodeAtOffset } from "./position.js";

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
  /** Re-render from edited MDX (positions shift, so highlight is re-applied). */
  update(mdx: string): Promise<void>;
  /** Box the element at an index-path; `undefined` clears the overlay. */
  highlight(indexPath: readonly number[] | undefined): void;
  dispose(): void;
}

/**
 * Render the annotated site into `target` and report the selected mdast node on click.
 * The same renderer drives this and publish, so what the canvas shows is what publishes.
 */
export async function mountCanvas(options: CanvasOptions): Promise<CanvasHandle> {
  const host = options.target as HTMLElement;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";

  const content = document.createElement("div");
  host.appendChild(content);

  // The selection overlay is positioned against `host` and never intercepts clicks,
  // so it lives outside the preact-managed `content` subtree.
  let overlay: HTMLElement | undefined;
  let currentPath: readonly number[] | undefined;

  // The doc is reparsed on every render so its positions match the rendered DOM;
  // the click handler closes over this mutable binding.
  let doc = parseMdx(options.mdx);

  async function paint(mdx: string): Promise<void> {
    doc = parseMdx(mdx);
    const tree = await renderEditableToVNode({
      mdx,
      components: options.components,
      data: options.data,
    });
    render(tree, content);
  }

  function clearOverlay(): void {
    overlay?.remove();
    overlay = undefined;
  }

  function highlight(indexPath: readonly number[] | undefined): void {
    currentPath = indexPath;
    if (!indexPath) {
      clearOverlay();
      return;
    }
    const node = nodeAtIndexPath(doc, indexPath);
    const offset = node?.position?.start.offset;
    const el =
      offset === undefined ? null : content.querySelector(`[${POS_ATTR}="${offset}"]`);
    if (!el) {
      clearOverlay();
      return;
    }
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "nocms-overlay";
      overlay.style.position = "absolute";
      overlay.style.pointerEvents = "none";
      host.appendChild(overlay);
    }
    const rect = el.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    overlay.style.left = `${rect.left - hostRect.left}px`;
    overlay.style.top = `${rect.top - hostRect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }

  const handleClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    options.onSelect?.(selectionAtElement(doc, target));
  };
  host.addEventListener("click", handleClick);

  await paint(options.mdx);

  return {
    async update(mdx: string) {
      await paint(mdx);
      highlight(currentPath);
    },
    highlight,
    dispose() {
      host.removeEventListener("click", handleClick);
      clearOverlay();
      render(null, content);
      content.remove();
    },
  };
}
