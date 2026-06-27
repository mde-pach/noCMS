// The editor shell: the interaction loop that turns the pieces into a usable editor.
// It lays out a canvas region beside a side panel, keeps one live MdxDocument, and on
// every selection resolves the meaningful node, looks up its schema, and renders the
// props panel. A panel edit mutates the node in place; the shell re-serializes, re-renders
// the canvas from the updated source, and re-highlights the same node by its index-path —
// never by raw offset, which shifts when the edit changes the source length.
//
// Every structural change — insert, delete, reorder, drag — is one tree-transform over
// the uniform block tree (D15), addressed by index-path, then re-serialized to canonical
// MDX. Because every edit (inline text, prop, structural) funnels through one commit that
// snapshots the serialized MDX, undo/redo is a single uniform stack, not one history per
// edit kind. Nothing here special-cases a block type, so a brick added to the registry
// reorders, inserts, and deletes with zero changes here.
//
// Double-clicking a paragraph or heading edits its text in place via @nocms/prose: a
// transient ProseMirror view mounts over the block, edits splice into the live document,
// and the canvas re-renders only on commit (a click elsewhere, or Escape) — re-rendering
// mid-edit would tear the view out.

import type { ComponentRegistry } from "@nocms/components";
import { deriveControls } from "@nocms/core";
import { mountProseEditor, type ProseEditorHandle } from "@nocms/prose";
import type { ComponentMap } from "@nocms/renderer";
import { parseTokens, toCssVariables } from "@nocms/tokens";
import type { Nodes, Parent, PhrasingContent } from "mdast";
import { render } from "preact";
import {
  boundingRect,
  type CanvasHandle,
  type CanvasSelection,
  mountCanvas,
  offsetFromElement,
} from "./canvas.js";
import { type BlockBox, destinationIndex, dropGapAt } from "./drag.js";
import { createHistory } from "./history.js";
import { isJsxElement } from "./jsx-attributes.js";
import { type MdxDocument, parseMdx, serializeMdx } from "./mdx-document.js";
import { createBlockNode, paletteItems } from "./palette.js";
import { PaletteMenu } from "./palette-menu.js";
import {
  type IndexPath,
  indexPathOf,
  nearestOfType,
  nodeAtIndexPath,
  nodeAtOffset,
} from "./position.js";
import { PropsPanel } from "./props-panel.js";
import { isProseEditable, type ProseBlock } from "./prose-edit.js";
import { selectableNode } from "./selectable.js";
import { SelectionToolbar } from "./selection-toolbar.js";
import { TokensPanel } from "./tokens-panel.js";
import { insertAt, moveChild, moveNode, removeAt } from "./tree-edit.js";

export interface EditorOptions {
  /** DOM node the editor mounts into; the shell owns its contents. */
  target: Element;
  /** the document to edit; MDX text is the source of truth. */
  mdx: string;
  /** the component library MDX tags resolve to in the canvas; each block carries
   *  its valibot props schema, from which the props panel derives controls live. */
  components: ComponentRegistry;
  /** @deprecated controls are now derived live from each block's schema (D9); ignored. */
  schemas?: Record<string, unknown>;
  /** values exposed to the document as props. */
  data?: Record<string, unknown>;
  /** flat token source; when present, the design panel themes the canvas live. */
  tokens?: string;
  /** fired with the serialized MDX after every edit — the seam to save/commit. */
  onChange?: (mdx: string) => void;
  /** fired with the flat token source after a theme edit — the seam to save/commit. */
  onTokensChange?: (tokens: string) => void;
}

export interface EditorHandle {
  /** The live prose view when a text block is being edited in place, else undefined.
   *  The escape hatch for host UI (a formatting toolbar) and tests. */
  proseView(): ProseEditorHandle["view"] | undefined;
  /** The index-path of the selected block, or undefined when nothing is selected. */
  selection(): IndexPath | undefined;
  /** Step the uniform history back/forward; the seam for host undo/redo chrome. */
  undo(): void;
  redo(): void;
  dispose(): void;
}

function toComponentMap(registry: ComponentRegistry): ComponentMap {
  return Object.fromEntries(
    Object.entries(registry).map(([name, entry]) => [name, entry.component]),
  );
}

function childrenOf(node: Nodes | undefined): Nodes[] {
  return node && "children" in node ? (node as Parent).children : [];
}

/** A keystroke landing in a text field or the prose view must not trigger a block-level
 *  shortcut (delete, reorder, slash) — that is the field's own input. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest(".ProseMirror")) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

interface InsertTarget {
  parentPath: IndexPath;
  index: number;
}

/**
 * Mount the in-site editor into `target`. Resolves once the canvas has rendered.
 * Saving/publishing (repo + auth) wires onto `onChange` and is out of scope here.
 */
export async function mountEditor(options: EditorOptions): Promise<EditorHandle> {
  const { target, mdx, components, data, onChange, onTokensChange } = options;
  let doc: MdxDocument = parseMdx(mdx);
  const history = createHistory(serializeMdx(doc));

  const style = document.createElement("style");
  style.textContent = EDITOR_CSS;
  const layout = document.createElement("div");
  layout.className = "nocms-editor";
  const canvasRegion = document.createElement("div");
  canvasRegion.className = "nocms-editor-canvas";
  const toolbarHost = document.createElement("div");
  toolbarHost.className = "nocms-toolbar-host";
  const insertsHost = document.createElement("div");
  insertsHost.className = "nocms-inserts-host";
  const paletteHost = document.createElement("div");
  const panelRegion = document.createElement("div");
  panelRegion.className = "nocms-editor-panel";
  const propsHost = document.createElement("div");
  const tokensHost = document.createElement("div");
  panelRegion.append(propsHost, tokensHost);
  layout.append(canvasRegion, panelRegion, paletteHost);
  target.append(style, layout);

  // Runtime theming: a single <style> the design panel rewrites live (no rebuild).
  const themeStyle = document.createElement("style");
  if (options.tokens !== undefined) {
    themeStyle.textContent = toCssVariables(parseTokens(options.tokens));
    target.append(themeStyle);
    render(
      <TokensPanel
        tokens={parseTokens(options.tokens)}
        onChange={(_next, flat, css) => {
          themeStyle.textContent = css;
          onTokensChange?.(flat);
        }}
      />,
      tokensHost,
    );
  }

  let selectedPath: IndexPath | undefined;
  let paletteTarget: InsertTarget | undefined;
  let dragFrom: IndexPath | undefined;

  // A live in-place prose edit. While one is active the canvas hands clicks inside `el`
  // to the ProseMirror view untouched (see `suppressWhen`), and the canvas is not
  // re-rendered (that would tear the view out); edits splice into `doc` live and the
  // canvas only re-renders on commit.
  let prose: { handle: ProseEditorHandle; el: Element; path: IndexPath } | undefined;

  const childCountAt = (path: IndexPath): number =>
    childrenOf(nodeAtIndexPath(doc, path)).length;

  // The chrome (toolbar, "+" handles) is positioned in the canvas's *content* space —
  // coordinates that scroll with the page — so it tracks each block. `getBoundingClientRect`
  // is viewport-relative, so the canvas origin and its scroll offset convert it.
  const contentTop = (el: Element): { top: number; bottom: number } => {
    const region = canvasRegion.getBoundingClientRect();
    // A component renders inside a boxless `display:contents` carrier; use the union of
    // its real descendant boxes, as the selection overlay does.
    const rect = boundingRect(el);
    const base = region.top - canvasRegion.scrollTop;
    return { top: rect.top - base, bottom: rect.bottom - base };
  };

  const elementAtPath = (path: IndexPath): Element | null => {
    const offset = nodeAtIndexPath(doc, path)?.position?.start.offset;
    return offset === undefined
      ? null
      : canvasRegion.querySelector(`[data-mdx-pos="${offset}"]`);
  };

  // The content-space Y of each sibling gap of the root: above the first block, below the
  // last, and the midpoint between neighbours otherwise.
  const gapTops = (): number[] => {
    const count = childCountAt([]);
    const bounds = Array.from({ length: count }, (_unused, i) => {
      const el = elementAtPath([i]);
      return el ? contentTop(el) : undefined;
    });
    return Array.from({ length: count + 1 }, (_unused, gap) => {
      const before = bounds[gap - 1];
      const after = bounds[gap];
      if (before && after) return (before.bottom + after.top) / 2;
      if (after) return after.top - 6;
      if (before) return before.bottom + 6;
      return 8;
    });
  };

  // A prop edit mutates the selected node in place, so the doc is re-serialized but not
  // re-parsed (that would invalidate the panel's node reference and steal input focus).
  const handleEdit = async (): Promise<void> => {
    const next = serializeMdx(doc);
    history.push(next);
    await canvas.update(next);
    canvas.highlight(selectedPath);
    onChange?.(next);
  };

  // Apply already-serialized MDX as the new document: re-parse (so positions and node
  // references are fresh), re-render the canvas, restore selection. Used by every
  // structural transform and by undo/redo — not by in-place prop/prose edits.
  const apply = async (
    nextMdx: string,
    nextPath: IndexPath | undefined,
  ): Promise<void> => {
    doc = parseMdx(nextMdx);
    await canvas.update(nextMdx);
    select(nextPath);
    renderInserts();
  };

  const commit = async (
    nextMdx: string,
    nextPath: IndexPath | undefined,
  ): Promise<void> => {
    history.push(nextMdx);
    await apply(nextMdx, nextPath);
    onChange?.(nextMdx);
  };

  const undo = (): void => {
    const state = history.undo();
    if (state === undefined) return;
    void apply(state, undefined).then(() => onChange?.(state));
  };

  const redo = (): void => {
    const state = history.redo();
    if (state === undefined) return;
    void apply(state, undefined).then(() => onChange?.(state));
  };

  const insertBlock = async (target_: InsertTarget, name: string): Promise<void> => {
    const node = createBlockNode(name, components[name]);
    const at = Math.max(0, Math.min(target_.index, childCountAt(target_.parentPath)));
    const next = insertAt(doc, target_.parentPath, at, node);
    await commit(serializeMdx(next), [...target_.parentPath, at]);
  };

  const deleteSelected = async (): Promise<void> => {
    if (!selectedPath || selectedPath.length === 0) return;
    const next = removeAt(doc, selectedPath);
    await commit(serializeMdx(next), undefined);
  };

  const moveSelected = async (direction: -1 | 1): Promise<void> => {
    if (!selectedPath || selectedPath.length === 0) return;
    const parentPath = selectedPath.slice(0, -1);
    const from = selectedPath[selectedPath.length - 1] ?? 0;
    const to = Math.max(0, Math.min(from + direction, childCountAt(parentPath) - 1));
    if (to === from) return;
    const next = moveChild(doc, parentPath, from, to);
    await commit(serializeMdx(next), [...parentPath, to]);
  };

  // Drag-reorder among siblings: the drop position is geometry (drag.ts), the move
  // itself is a `moveNode` tree-transform — drag holds no separate model, so it shares
  // the one undo stack with every other edit.
  const siblingBoxes = (parentPath: IndexPath): BlockBox[] => {
    const siblings = childrenOf(nodeAtIndexPath(doc, parentPath));
    const region = canvasRegion.getBoundingClientRect();
    const boxes: BlockBox[] = [];
    siblings.forEach((child, index) => {
      const offset = child.position?.start.offset;
      const el =
        offset === undefined
          ? null
          : canvasRegion.querySelector(`[data-mdx-pos="${offset}"]`);
      if (!el) return;
      // Component blocks render inside a boxless `display:contents` carrier; measure the
      // union of its real descendant boxes, else every gap collapses to zero.
      const rect = boundingRect(el);
      boxes.push({
        index,
        top: rect.top - region.top,
        bottom: rect.bottom - region.top,
      });
    });
    return boxes;
  };

  const handleDrop = async (event: DragEvent): Promise<void> => {
    if (!dragFrom || dragFrom.length === 0) return;
    event.preventDefault();
    const parentPath = dragFrom.slice(0, -1);
    const from = dragFrom[dragFrom.length - 1] ?? 0;
    const region = canvasRegion.getBoundingClientRect();
    const gap = dropGapAt(siblingBoxes(parentPath), event.clientY - region.top);
    const to = destinationIndex(from, gap);
    dragFrom = undefined;
    if (to === undefined) return;
    const next = moveNode(doc, [...parentPath, from], parentPath, to);
    await commit(serializeMdx(next), [...parentPath, to]);
  };

  const openPalette = (target_: InsertTarget): void => {
    paletteTarget = target_;
    renderPalette();
  };

  const closePalette = (): void => {
    paletteTarget = undefined;
    renderPalette();
  };

  function renderPalette(): void {
    if (!paletteTarget) {
      render(null, paletteHost);
      return;
    }
    const target_ = paletteTarget;
    render(
      <PaletteMenu
        items={paletteItems(components)}
        onPick={(name) => {
          closePalette();
          void insertBlock(target_, name);
        }}
        onClose={closePalette}
      />,
      paletteHost,
    );
  }

  // A "+" affordance in each sibling gap of the root — the discoverable, mouse-first
  // inserter. Slot-internal handles follow the same `insert(node, atPath)` transform.
  function renderInserts(): void {
    if (prose) {
      render(null, insertsHost);
      return;
    }
    const tops = gapTops();
    render(
      <div class="nocms-inserts">
        {tops.map((top, gap) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: gap index is the stable identity here.
            key={gap}
            type="button"
            class="nocms-insert-handle"
            data-insert-index={gap}
            title="Insert block"
            style={{ top: `${top}px` }}
            onClick={(event) => {
              // The canvas click handler would treat this as a deselect.
              event.stopPropagation();
              openPalette({ parentPath: [], index: gap });
            }}
          >
            +
          </button>
        ))}
      </div>,
      insertsHost,
    );
  }

  function renderToolbar(): void {
    const node = selectedPath ? nodeAtIndexPath(doc, selectedPath) : undefined;
    if (!node || !selectedPath || selectedPath.length === 0 || prose) {
      render(null, toolbarHost);
      toolbarHost.style.display = "none";
      return;
    }
    const parentPath = selectedPath.slice(0, -1);
    const from = selectedPath[selectedPath.length - 1] ?? 0;
    const count = childCountAt(parentPath);
    const label = "name" in node && node.name ? String(node.name) : node.type;
    const el = elementAtPath(selectedPath);
    if (el) {
      const { top } = contentTop(el);
      // Float just above the block, clamped so it never hides above the scroll origin.
      toolbarHost.style.top = `${Math.max(top - 34, 4)}px`;
      toolbarHost.style.display = "block";
    }
    render(
      <SelectionToolbar
        label={label}
        canMoveUp={from > 0}
        canMoveDown={from < count - 1}
        onMoveUp={() => void moveSelected(-1)}
        onMoveDown={() => void moveSelected(1)}
        onDelete={() => void deleteSelected()}
        onInsert={() => openPalette({ parentPath, index: from + 1 })}
        onDragStart={(event) => {
          dragFrom = selectedPath;
          event.dataTransfer?.setData("text/plain", "");
        }}
        onDragEnd={() => {
          dragFrom = undefined;
        }}
      />,
      toolbarHost,
    );
  }

  const startProse = (block: ProseBlock, el: Element, path: IndexPath): void => {
    canvas.highlight(undefined);
    showPanel(undefined);
    renderToolbar();
    renderInserts();
    el.replaceChildren();
    const handle = mountProseEditor(el, {
      nodes: block.children,
      onChange: (nodes: PhrasingContent[]) => {
        block.children = nodes;
        onChange?.(serializeMdx(doc));
      },
    });
    handle.view.focus();
    prose = { handle, el, path };
  };

  const commitProse = async (): Promise<IndexPath | undefined> => {
    if (!prose) return undefined;
    const { handle, path } = prose;
    prose = undefined;
    handle.destroy();
    const next = serializeMdx(doc);
    history.push(next);
    await apply(next, path);
    return path;
  };

  function showPanel(node: Nodes | undefined): void {
    if (node && isJsxElement(node) && node.name) {
      const def = components[node.name];
      if (def?.schema) {
        render(
          <PropsPanel
            element={node}
            component={node.name}
            controls={deriveControls(def.schema)}
            onChange={handleEdit}
          />,
          propsHost,
        );
        return;
      }
    }
    render(
      <p class="nocms-empty">
        {node ? "No editable properties." : "Select an element to edit it."}
      </p>,
      propsHost,
    );
  }

  function select(path: IndexPath | undefined): void {
    selectedPath = path;
    canvas.highlight(path);
    showPanel(path ? nodeAtIndexPath(doc, path) : undefined);
    renderToolbar();
  }

  const handleSelect = async (
    selection: CanvasSelection | undefined,
  ): Promise<void> => {
    // A click outside the active prose block reaches here (clicks inside it are
    // suppressed): commit the edit first, then select what was clicked.
    if (prose) await commitProse();
    if (paletteTarget) closePalette();
    const node = selection ? selectableNode(selection.path) : undefined;
    select(node ? indexPathOf(selection?.path ?? [], node) : undefined);
  };

  // Double-click a paragraph or heading to edit its text in place via the prose widget.
  const handleActivate = (event: Event): void => {
    if (prose) return; // inside an active edit — let ProseMirror handle the double-click
    const el = event.target;
    if (!(el instanceof Element)) return;
    const offset = offsetFromElement(el);
    if (offset === undefined) return;
    const path = nodeAtOffset(doc, offset);
    const block = nearestOfType(path, ["paragraph", "heading"]);
    if (!block || !isProseEditable(block)) return;
    const indexPath = indexPathOf(path, block);
    if (!indexPath) return;
    const blockOffset = block.position?.start.offset;
    const blockEl =
      blockOffset === undefined
        ? null
        : canvasRegion.querySelector(`[data-mdx-pos="${blockOffset}"]`);
    if (blockEl) startProse(block, blockEl, indexPath);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && prose) {
      event.preventDefault();
      void commitProse().then(select);
    }
  };

  // Block-level shortcuts live on the whole editor so they work whether the canvas or a
  // panel has focus, but defer to any text field (including the prose view) so typing is
  // never hijacked.
  const handleShortcuts = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && paletteTarget) {
      event.preventDefault();
      closePalette();
      return;
    }
    if (isTextEntry(event.target)) return;
    const mod = event.metaKey || event.ctrlKey;
    if (mod && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && event.key === "y") {
      event.preventDefault();
      redo();
      return;
    }
    if (prose) return;
    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      void moveSelected(-1);
      return;
    }
    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      void moveSelected(1);
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && selectedPath) {
      event.preventDefault();
      void deleteSelected();
      return;
    }
    if (event.key === "/") {
      event.preventDefault();
      if (selectedPath && selectedPath.length > 0) {
        openPalette({
          parentPath: selectedPath.slice(0, -1),
          index: (selectedPath[selectedPath.length - 1] ?? -1) + 1,
        });
      } else {
        openPalette({ parentPath: [], index: childCountAt([]) });
      }
    }
  };

  const canvas: CanvasHandle = await mountCanvas({
    target: canvasRegion,
    mdx,
    components: toComponentMap(components),
    data,
    onSelect: handleSelect,
    suppressWhen: (el) => prose?.el.contains(el) ?? false,
  });
  canvasRegion.append(insertsHost, toolbarHost);

  canvasRegion.addEventListener("dblclick", handleActivate);
  canvasRegion.addEventListener("keydown", handleKeydown);
  canvasRegion.addEventListener("dragover", (event) => {
    if (dragFrom) event.preventDefault();
  });
  canvasRegion.addEventListener("drop", (event) => void handleDrop(event));
  layout.addEventListener("keydown", handleShortcuts);
  // Block geometry shifts on resize; re-place the chrome that tracks it.
  const reposition = (): void => {
    renderInserts();
    renderToolbar();
  };
  window.addEventListener("resize", reposition);

  showPanel(undefined);
  renderInserts();

  return {
    proseView: () => prose?.handle.view,
    selection: () => selectedPath,
    undo,
    redo,
    dispose() {
      prose?.handle.destroy();
      prose = undefined;
      canvasRegion.removeEventListener("dblclick", handleActivate);
      canvasRegion.removeEventListener("keydown", handleKeydown);
      layout.removeEventListener("keydown", handleShortcuts);
      window.removeEventListener("resize", reposition);
      canvas.dispose();
      render(null, propsHost);
      render(null, tokensHost);
      render(null, toolbarHost);
      render(null, insertsHost);
      render(null, paletteHost);
      layout.remove();
      style.remove();
      themeStyle.remove();
    },
  };
}

const EDITOR_CSS = `
.nocms-editor { display: flex; align-items: stretch; min-height: 100vh; position: relative; }
.nocms-editor-canvas { flex: 1 1 auto; overflow: auto; position: relative; }
.nocms-editor-panel {
  flex: 0 0 18rem; overflow: auto; padding: 1rem; background: #fafafa;
  border-left: 1px solid #e5e7eb; font: 14px/1.4 system-ui, sans-serif; color: #111827;
}
.nocms-overlay { outline: 2px solid #3b82f6; border-radius: 3px; background: rgba(59,130,246,0.08); }
.nocms-editor-canvas .ProseMirror { white-space: pre-wrap; outline: 2px solid #3b82f6; outline-offset: 2px; border-radius: 3px; }
.nocms-props-title { font-size: 14px; margin: 0 0 0.75rem; }
.nocms-field { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.75rem; }
.nocms-field label { font-weight: 600; font-size: 12px; }
.nocms-field input, .nocms-field select { padding: 0.35rem; border: 1px solid #d1d5db; border-radius: 4px; font: inherit; }
.nocms-help { color: #6b7280; font-size: 12px; margin: 0; }
.nocms-empty { color: #6b7280; font-size: 13px; }
.nocms-tokens { margin-top: 1.25rem; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
.nocms-tokens-group { margin-bottom: 1rem; }
.nocms-tokens-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; margin: 0 0 0.5rem; }
.nocms-tokens .nocms-field input[type="color"] { height: 2rem; padding: 0.1rem; }
.nocms-toolbar {
  display: inline-flex; gap: 2px; align-items: center; padding: 2px;
  background: #1f2937; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  font: 12px/1 system-ui, sans-serif;
}
.nocms-toolbar button, .nocms-tool-drag {
  border: 0; background: transparent; color: #f9fafb; cursor: pointer;
  padding: 4px 6px; border-radius: 4px; font: inherit;
}
.nocms-toolbar button:disabled { opacity: 0.35; cursor: default; }
.nocms-toolbar button:not(:disabled):hover { background: #374151; }
.nocms-tool-drag { cursor: grab; }
.nocms-tool-tag { color: #9ca3af; padding: 0 4px; }
.nocms-toolbar-host { position: absolute; left: 8px; z-index: 9; display: none; }
.nocms-inserts { position: absolute; top: 0; left: 0; width: 100%; height: 0; pointer-events: none; }
.nocms-insert-handle {
  position: absolute; left: 8px; pointer-events: auto; border: 0;
  width: 22px; height: 22px; border-radius: 50%; background: #3b82f6; color: #fff;
  cursor: pointer; opacity: 0; transition: opacity 0.1s; line-height: 1;
}
.nocms-editor-canvas:hover .nocms-insert-handle { opacity: 0.4; }
.nocms-insert-handle:hover { opacity: 1; }
.nocms-palette {
  position: absolute; top: 1rem; left: 50%; transform: translateX(-50%); z-index: 10;
  width: 16rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15); padding: 0.5rem; font: 14px/1.4 system-ui, sans-serif;
}
.nocms-palette-search { width: 100%; box-sizing: border-box; padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 4px; }
.nocms-palette-list { list-style: none; margin: 0.5rem 0 0; padding: 0; max-height: 16rem; overflow: auto; }
.nocms-palette-item { display: flex; justify-content: space-between; width: 100%; text-align: left; border: 0; background: transparent; padding: 0.35rem 0.5rem; border-radius: 4px; cursor: pointer; font: inherit; }
.nocms-palette-item:hover { background: #eff6ff; }
.nocms-palette-tag { color: #9ca3af; }
.nocms-palette-empty { color: #6b7280; padding: 0.35rem 0.5rem; }
`;
