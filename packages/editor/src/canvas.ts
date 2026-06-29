// Selection is keyed on the `data-mdx-pos` source offset each element carries, never on
// matching rendered values against the DOM: a click resolves that offset back to its mdast node.

import type { ComponentMap } from "@nocms/renderer";
import type { Nodes } from "mdast";
import { render } from "preact";
import { renderEditableToVNode } from "./editable.js";
import { type MdxDocument, parseMdx } from "./mdx-document.js";
import { nodeAtIndexPath, nodeAtOffset } from "./position.js";

const POS_ATTR = "data-mdx-pos";

// A component is wrapped in a `display:contents` carrier that holds its source offset but
// generates no box of its own, so descend through such carriers to the real elements.
function layoutRects(el: Element, out: DOMRect[]): void {
  const rect = el.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) {
    out.push(rect);
    return;
  }
  for (const child of el.children) layoutRects(child, out);
}

/** A measurable box for `el`, falling back to the union of its descendants' boxes when
 *  `el` itself is a boxless `display:contents` carrier. */
export function boundingRect(el: Element): DOMRect {
  const own = el.getBoundingClientRect();
  if (own.width > 0 || own.height > 0) return own;
  const rects: DOMRect[] = [];
  layoutRects(el, rects);
  if (rects.length === 0) return own;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const r of rects) {
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return new DOMRect(left, top, right - left, bottom - top);
}

export interface CanvasSelection {
  /** source offset of the clicked element's nearest annotated ancestor */
  offset: number;
  /** the most specific mdast node at the offset */
  node: Nodes;
  /** root → deepest chain, for choosing selection granularity */
  path: Nodes[];
  /** the actual clicked element, so the shell can read a `data-nocms-path` content anchor on it */
  element: Element;
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
  return node ? { offset, node, path, element: el } : undefined;
}

export interface CanvasOptions {
  target: Element;
  mdx: string;
  /** components MDX tags resolve to */
  components: ComponentMap;
  /** values exposed to the document as props */
  data?: Record<string, unknown>;
  /** called on every canvas click; `undefined` when the click hits no annotated element */
  onSelect?: (selection: CanvasSelection | undefined) => void;
  /** called after every render, with the content host and the doc parsed from that same MDX,
   *  so their offsets match the freshly rendered DOM (the seam the content-anchor pass hooks). */
  onPainted?: (content: HTMLElement, doc: MdxDocument) => void;
  /**
   * When this returns true for a click target, the canvas leaves the event entirely alone —
   * no `preventDefault`, no `onSelect`. The shell uses it to hand clicks inside a live
   * in-place editor (e.g. the prose widget) to that editor untouched.
   */
  suppressWhen?: (target: Element) => boolean;
}

export interface CanvasHandle {
  /** Re-render from edited MDX (positions shift, so highlight is re-applied). */
  update(mdx: string): Promise<void>;
  /** Box the element at an index-path; `undefined` clears the overlay. */
  highlight(indexPath: readonly number[] | undefined): void;
  dispose(): void;
}

/** Render the annotated site into `target` and report the selected mdast node on click. */
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
    options.onPainted?.(content, doc);
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
    const rect = boundingRect(el);
    const hostRect = host.getBoundingClientRect();
    overlay.style.left = `${rect.left - hostRect.left}px`;
    overlay.style.top = `${rect.top - hostRect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }

  const handleClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (options.suppressWhen?.(target)) return;
    // The canvas is an editing surface, not a live site: a click selects, it must not
    // follow links or submit forms.
    event.preventDefault();
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
