// The editor shell: the interaction loop that turns the pieces into a usable editor.
// It lays out a canvas region beside a side panel, keeps one live MdxDocument, and on
// every selection resolves the meaningful node, looks up its schema, and renders the
// props panel. A panel edit mutates the node in place; the shell re-serializes, re-renders
// the canvas from the updated source, and re-highlights the same node by its index-path —
// never by raw offset, which shifts when the edit changes the source length.
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
import type { Nodes, PhrasingContent } from "mdast";
import { render } from "preact";
import {
  type CanvasHandle,
  type CanvasSelection,
  mountCanvas,
  offsetFromElement,
} from "./canvas.js";
import { isJsxElement } from "./jsx-attributes.js";
import { parseMdx, serializeMdx } from "./mdx-document.js";
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
import { TokensPanel } from "./tokens-panel.js";

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
  dispose(): void;
}

function toComponentMap(registry: ComponentRegistry): ComponentMap {
  return Object.fromEntries(
    Object.entries(registry).map(([name, entry]) => [name, entry.component]),
  );
}

/**
 * Mount the in-site editor into `target`. Resolves once the canvas has rendered.
 * Saving/publishing (repo + auth) wires onto `onChange` and is out of scope here.
 */
export async function mountEditor(options: EditorOptions): Promise<EditorHandle> {
  const { target, mdx, components, data, onChange, onTokensChange } = options;
  const doc = parseMdx(mdx);

  const style = document.createElement("style");
  style.textContent = EDITOR_CSS;
  const layout = document.createElement("div");
  layout.className = "nocms-editor";
  const canvasRegion = document.createElement("div");
  canvasRegion.className = "nocms-editor-canvas";
  const panelRegion = document.createElement("div");
  panelRegion.className = "nocms-editor-panel";
  const propsHost = document.createElement("div");
  const tokensHost = document.createElement("div");
  panelRegion.append(propsHost, tokensHost);
  layout.append(canvasRegion, panelRegion);
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

  // A live in-place prose edit. While one is active the canvas hands clicks inside `el`
  // to the ProseMirror view untouched (see `suppressWhen`), and the canvas is not
  // re-rendered (that would tear the view out); edits splice into `doc` live and the
  // canvas only re-renders on commit.
  let prose: { handle: ProseEditorHandle; el: Element; path: IndexPath } | undefined;

  const handleEdit = async (): Promise<void> => {
    const next = serializeMdx(doc);
    await canvas.update(next);
    canvas.highlight(selectedPath);
    onChange?.(next);
  };

  const startProse = (block: ProseBlock, el: Element, path: IndexPath): void => {
    canvas.highlight(undefined);
    showPanel(undefined);
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
    await canvas.update(serializeMdx(doc));
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

  const select = (path: IndexPath | undefined): void => {
    selectedPath = path;
    canvas.highlight(path);
    showPanel(path ? nodeAtIndexPath(doc, path) : undefined);
  };

  const handleSelect = async (
    selection: CanvasSelection | undefined,
  ): Promise<void> => {
    // A click outside the active prose block reaches here (clicks inside it are
    // suppressed): commit the edit first, then select what was clicked.
    if (prose) await commitProse();
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

  const canvas: CanvasHandle = await mountCanvas({
    target: canvasRegion,
    mdx,
    components: toComponentMap(components),
    data,
    onSelect: handleSelect,
    suppressWhen: (el) => prose?.el.contains(el) ?? false,
  });

  canvasRegion.addEventListener("dblclick", handleActivate);
  canvasRegion.addEventListener("keydown", handleKeydown);

  showPanel(undefined);

  return {
    proseView: () => prose?.handle.view,
    dispose() {
      prose?.handle.destroy();
      prose = undefined;
      canvasRegion.removeEventListener("dblclick", handleActivate);
      canvasRegion.removeEventListener("keydown", handleKeydown);
      canvas.dispose();
      render(null, propsHost);
      render(null, tokensHost);
      layout.remove();
      style.remove();
      themeStyle.remove();
    },
  };
}

const EDITOR_CSS = `
.nocms-editor { display: flex; align-items: stretch; min-height: 100vh; }
.nocms-editor-canvas { flex: 1 1 auto; overflow: auto; }
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
`;
