// The editor shell: the interaction loop that turns the pieces into a usable editor.
// It lays out a canvas region beside a side panel, keeps one live MdxDocument, and on
// every selection resolves the meaningful node, looks up its schema, and renders the
// props panel. A panel edit mutates the node in place; the shell re-serializes, re-renders
// the canvas from the updated source, and re-highlights the same node by its index-path —
// never by raw offset, which shifts when the edit changes the source length.

import type { ComponentRegistry } from "@nocms/components";
import type { ComponentSchema } from "@nocms/props-discovery";
import type { ComponentMap } from "@nocms/renderer";
import { parseTokens, toCssVariables } from "@nocms/tokens";
import type { Nodes } from "mdast";
import { render } from "preact";
import { type CanvasHandle, type CanvasSelection, mountCanvas } from "./canvas.js";
import { isJsxElement } from "./jsx-attributes.js";
import { parseMdx, serializeMdx } from "./mdx-document.js";
import { type IndexPath, indexPathOf, nodeAtIndexPath } from "./position.js";
import { PropsPanel } from "./props-panel.js";
import { selectableNode } from "./selectable.js";
import { TokensPanel } from "./tokens-panel.js";

export interface EditorOptions {
  /** DOM node the editor mounts into; the shell owns its contents. */
  target: Element;
  /** the document to edit; MDX text is the source of truth. */
  mdx: string;
  /** the component library MDX tags resolve to in the canvas. */
  components: ComponentRegistry;
  /** controls per component, discovered ahead of time and injected (not derived live). */
  schemas: Record<string, ComponentSchema>;
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
  const { target, mdx, components, schemas, data, onChange, onTokensChange } = options;
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

  const handleEdit = async (): Promise<void> => {
    const next = serializeMdx(doc);
    await canvas.update(next);
    canvas.highlight(selectedPath);
    onChange?.(next);
  };

  function showPanel(node: Nodes | undefined): void {
    if (node && isJsxElement(node) && node.name) {
      const schema = schemas[node.name];
      if (schema) {
        render(
          <PropsPanel element={node} schema={schema} onChange={handleEdit} />,
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

  const handleSelect = (selection: CanvasSelection | undefined): void => {
    const node = selection ? selectableNode(selection.path) : undefined;
    selectedPath = node ? indexPathOf(selection?.path ?? [], node) : undefined;
    canvas.highlight(selectedPath);
    showPanel(selectedPath ? nodeAtIndexPath(doc, selectedPath) : undefined);
  };

  const canvas: CanvasHandle = await mountCanvas({
    target: canvasRegion,
    mdx,
    components: toComponentMap(components),
    data,
    onSelect: handleSelect,
  });

  showPanel(undefined);

  return {
    dispose() {
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
