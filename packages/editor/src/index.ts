// The in-site editor: WYSIWYG over MDX, visual layout, and live token theming.
// It ships with each site and reuses the runtime renderer as its canvas. Heavy
// preview compilation loads only here, never in the reader's bundle.

import type { AuthConfig } from "@nocms/auth";
import type { ComponentRegistry } from "@nocms/components";
import type { RepoRef } from "@nocms/core";

export {
  type CanvasHandle,
  type CanvasOptions,
  type CanvasSelection,
  mountCanvas,
  offsetFromElement,
  selectionAtElement,
} from "./canvas.js";
export {
  getProp,
  isJsxElement,
  type JsxElement,
  type PropValue,
  removeProp,
  setProp,
} from "./jsx-attributes.js";
export { type MdxDocument, parseMdx, serializeMdx } from "./mdx-document.js";
export {
  deepestNodeAtOffset,
  type IndexPath,
  indexPathOf,
  nearestOfType,
  nodeAtIndexPath,
  nodeAtOffset,
} from "./position.js";
export { PropsPanel, type PropsPanelProps } from "./props-panel.js";
export {
  BLOCK_TYPES,
  JSX_TYPES,
  SELECTABLE_TYPES,
  selectableNode,
} from "./selectable.js";

export interface EditorOptions {
  repo: RepoRef;
  auth: AuthConfig;
  /** the component library available in the palette and the canvas */
  components: ComponentRegistry;
  /** DOM node the editor mounts into */
  target: Element;
}

export interface EditorHandle {
  dispose(): void;
}

export function mountEditor(_options: EditorOptions): EditorHandle {
  throw new Error("not implemented: mount the in-site editor");
}
