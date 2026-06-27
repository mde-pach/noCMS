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
export { type BlockBox, destinationIndex, dropGapAt } from "./drag.js";
export { createHistory, type History } from "./history.js";
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
  createBlockNode,
  filterPalette,
  type PaletteItem,
  paletteItems,
} from "./palette.js";
export { PaletteMenu, type PaletteMenuProps } from "./palette-menu.js";
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
  SelectionToolbar,
  type SelectionToolbarProps,
} from "./selection-toolbar.js";
export {
  type EditorHandle,
  type EditorOptions,
  mountEditor,
} from "./shell.js";
export { TokensPanel, type TokensPanelProps } from "./tokens-panel.js";
export { insertAt, moveChild, moveNode, removeAt } from "./tree-edit.js";
