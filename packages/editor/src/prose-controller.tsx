// In-place text editing: the prose session. Double-clicking a paragraph/heading hands its element
// to ProseMirror so the owner types directly on the page; this controller owns that session and
// the floating format bar, so the shell only asks "is a session active?" and "commit it". On
// commit the edited children are already in the document (mutated in place during typing, with
// onChange firing then), so it just snapshots into history and repaints via the document store.

import {
  mountProseEditor,
  type ProseEditorHandle,
  toggleProseMark,
} from "@nocms/prose";
import type { PhrasingContent } from "mdast";
import { render } from "preact";
import type { CanvasHandle } from "./canvas.js";
import type { DocumentStore } from "./document-store.js";
import { FormatBar } from "./format-bar.js";
import type { OverlayLayer } from "./overlays.js";
import type { IndexPath } from "./position.js";
import type { ProseHost } from "./prose-edit.js";

export interface ProseController {
  isActive(): boolean;
  view(): ProseEditorHandle["view"] | undefined;
  /** true when `el` is inside the live prose widget — the canvas leaves those clicks alone. */
  containsEl(el: Element): boolean;
  /** begin editing `host`'s text in `el` (at index-path `path`). `inline` scopes the editor to a
   *  single inline component (a Badge) so it edits in place rather than as a block. */
  start(host: ProseHost, el: Element, path: IndexPath, inline?: boolean): void;
  /** end the session, snapshot to history, repaint; resolves to the edited block's path. */
  commit(): Promise<IndexPath | undefined>;
  /** re-pin the format bar after a reflow/scroll while a session is open. */
  reposition(): void;
  dispose(): void;
}

export interface ProseControllerDeps {
  formatHost: HTMLElement;
  overlays: OverlayLayer;
  canvas: CanvasHandle;
  docs: DocumentStore;
  onChange?: (mdx: string) => void;
  markDirty: () => void;
  /** called when a session starts, so the shell hides the selection toolbar. */
  onStart: () => void;
}

export function createProseController(deps: ProseControllerDeps): ProseController {
  const { formatHost, overlays, canvas, docs, onChange, markDirty, onStart } = deps;
  let session:
    | { handle: ProseEditorHandle; el: Element; path: IndexPath; inline: boolean }
    | undefined;

  // The format bar floats just above the text being edited; its mark intents route through the
  // same prose marks the keymap uses, so there is one editing model.
  function showFormatBar(el: Element): void {
    formatHost.style.top = `${Math.max(overlays.surfaceTop(el) - 42, 6)}px`;
    formatHost.style.left = `${overlays.surfaceLeft(el)}px`;
    formatHost.style.display = "block";
    const view = () => session?.handle.view;
    render(
      <FormatBar
        onBold={() => {
          const v = view();
          if (v) toggleProseMark(v, "strong");
        }}
        onItalic={() => {
          const v = view();
          if (v) toggleProseMark(v, "em");
        }}
        onLink={() => {
          const v = view();
          const href = v ? window.prompt("Link URL") : null;
          if (v && href) toggleProseMark(v, "link", { href });
        }}
      />,
      formatHost,
    );
  }

  function hideFormatBar(): void {
    render(null, formatHost);
    formatHost.style.display = "none";
  }

  return {
    isActive: () => session !== undefined,
    view: () => session?.handle.view,
    containsEl: (el) => session?.el.contains(el) ?? false,

    start(host, el, path, inline = false) {
      canvas.highlight(undefined);
      overlays.clearHover();
      if (inline) el.classList.add("nocms-prose-inline");
      el.replaceChildren();
      const handle = mountProseEditor(el, {
        nodes: host.children,
        onChange: (nodes: PhrasingContent[]) => {
          host.children = nodes;
          onChange?.(docs.serialize());
          markDirty();
        },
      });
      handle.view.focus();
      session = { handle, el, path, inline };
      onStart();
      showFormatBar(el);
    },

    async commit() {
      if (!session) return undefined;
      const { handle, path } = session;
      session = undefined;
      handle.destroy();
      hideFormatBar();
      return docs.pushApply(path);
    },

    reposition() {
      if (session) showFormatBar(session.el);
    },

    dispose() {
      session?.handle.destroy();
      session = undefined;
      hideFormatBar();
    },
  };
}
