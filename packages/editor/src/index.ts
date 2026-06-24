// The in-site editor: WYSIWYG over MDX, visual layout, and live token theming.
// It ships with each site and reuses the runtime renderer as its canvas. Heavy
// preview compilation loads only here, never in the reader's bundle.

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
export {
  type EditorHandle,
  type EditorOptions,
  mountEditor,
} from "./shell.js";
