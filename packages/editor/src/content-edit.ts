// Inline editing of content that maps to a component prop (a `data-nocms-path` leaf): the rendered
// element itself becomes editable, and the text is written back to the same prop the panel edits —
// so direct-on-page editing and the panel are two faces of one value, kept in sync as you type.
// These props are plain strings, so this is plain contenteditable, not the prose editor.

import type { ControlDescriptor } from "@nocms/core";
import type { CanvasHandle } from "./canvas.js";
import type { DocumentStore } from "./document-store.js";
import {
  getStructuredProp,
  type JsxElement,
  setProp,
  setStructuredProp,
} from "./jsx-attributes.js";

export interface ContentEditor {
  isActive(): boolean;
  /** true when `el` is inside the live editable — the canvas leaves those clicks alone. */
  containsEl(el: Element): boolean;
  /** make `el` (a content leaf at dotted `path`) editable, writing back to `node`'s props. */
  start(
    el: HTMLElement,
    node: JsxElement,
    path: string,
    controls: ControlDescriptor[],
  ): void;
  /** finalize: snapshot the edit to history and repaint the canvas. */
  commit(): Promise<void>;
  /** abandon the edit, restoring the original value (no history entry). */
  cancel(): void;
  dispose(): void;
}

export interface ContentEditorDeps {
  docs: DocumentStore;
  canvas: CanvasHandle;
  /** called when a session starts, so the shell hides the selection chrome. */
  onStart: () => void;
  /** repaint the chrome (panel) — NOT the canvas — so the panel field tracks the live value
   *  without tearing down the contenteditable the user is typing in. */
  refreshPanel: () => void;
  markDirty: () => void;
}

type Attributes = JsxElement["attributes"];

/** Write `value` to the prop at dotted `path`. A bare key is a scalar attribute; a nested path
 *  (`tiers.2.name`) updates within the structured attribute, seeded from the schema default when
 *  the prop isn't yet in source — the same materialize-then-write the props panel does. */
function writeContentProp(
  node: JsxElement,
  controls: ControlDescriptor[],
  path: string,
  value: string,
): void {
  const segs = path.split(".");
  const top = segs[0];
  if (top === undefined) return;
  if (segs.length === 1) {
    setProp(node, top, value);
    return;
  }
  const base =
    getStructuredProp(node, top) ?? controls.find((c) => c.key === top)?.default;
  const next = structuredClone(base ?? {}) as Record<string, unknown>;
  let cur: Record<string, unknown> = next;
  for (let i = 1; i < segs.length - 1; i++) {
    const key = segs[i];
    if (key === undefined) return;
    const step = cur[key];
    if (!step || typeof step !== "object") return;
    cur = step as Record<string, unknown>;
  }
  const last = segs[segs.length - 1];
  if (last !== undefined) cur[last] = value;
  setStructuredProp(node, top, next);
}

export function createContentEditor(deps: ContentEditorDeps): ContentEditor {
  const { docs, canvas, onStart, refreshPanel, markDirty } = deps;
  let session:
    | {
        el: HTMLElement;
        node: JsxElement;
        path: string;
        controls: ControlDescriptor[];
        originalText: string;
        // Exact attribute snapshot, so cancel restores the source even when the prop wasn't
        // present before (a default that live edits would otherwise have materialized).
        originalAttributes: Attributes;
        onInput: () => void;
        changed: boolean;
      }
    | undefined;

  function teardown(): void {
    if (!session) return;
    session.el.removeEventListener("input", session.onInput);
    session.el.removeAttribute("contenteditable");
    session.el.classList.remove("nocms-content-editing");
    session = undefined;
  }

  return {
    isActive: () => session !== undefined,
    containsEl: (el) => session?.el.contains(el) ?? false,

    start(el, node, path, controls) {
      canvas.highlight(undefined);
      el.classList.add("nocms-content-editing");
      el.setAttribute("contenteditable", "plaintext-only");

      // Each keystroke writes the live text to the prop and repaints the panel only, so the panel
      // field mirrors the on-page text as it is typed — without disturbing the caret.
      const onInput = (): void => {
        if (!session) return;
        session.changed = true;
        writeContentProp(node, controls, path, el.textContent ?? "");
        markDirty();
        refreshPanel();
      };
      el.addEventListener("input", onInput);

      session = {
        el,
        node,
        path,
        controls,
        originalText: el.textContent ?? "",
        originalAttributes: structuredClone(node.attributes),
        onInput,
        changed: false,
      };
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      onStart();
    },

    async commit() {
      if (!session) return;
      const { changed } = session;
      teardown();
      // The node already holds the live value (written per keystroke). Snapshot to history and
      // repaint the canvas so every occurrence of the prop reflects the final text.
      if (changed) await docs.handleEdit();
    },

    cancel() {
      if (!session) return;
      const { el, node, originalText, originalAttributes } = session;
      node.attributes = originalAttributes;
      el.textContent = originalText;
      teardown();
      refreshPanel();
    },

    dispose() {
      teardown();
    },
  };
}
