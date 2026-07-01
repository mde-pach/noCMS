// In-place text editing: the prose session. Clicking into prose hands the block to a block-aware
// ProseMirror so the owner writes directly on the page — Enter makes new paragraphs, `- ` a list, and
// so on. A top-level prose block can grow into several blocks as you type; the session keeps the mdast
// in sync by replacing the block's span in its parent on every change, and repaints on commit. The
// inline variant (a `<Badge>`'s text) stays a single line. The shell only asks "active?" and "commit".

import {
  mountProseEditor,
  type ProseEditorHandle,
  toggleProseMark,
} from "@nocms/prose";
import type { Paragraph, Parent, RootContent } from "mdast";
import { render } from "preact";
import type { CanvasHandle } from "./canvas.js";
import type { DocumentStore } from "./document-store.js";
import { FormatBar } from "./format-bar.js";
import type { OverlayLayer } from "./overlays.js";
import { type IndexPath, nodeAtIndexPath } from "./position.js";
import type { ProseHost } from "./prose-edit.js";

export interface ProseController {
  isActive(): boolean;
  view(): ProseEditorHandle["view"] | undefined;
  /** true when `el` is inside the live prose widget — the canvas leaves those clicks alone. */
  containsEl(el: Element): boolean;
  /** begin editing the prose `node` rendered at `el` (index-path `path`). `opts.inline` scopes the
   *  editor to one inline component (a Badge), kept to a single line. `opts.at` is the click point —
   *  the caret lands there. `opts.label` is the block's name, shown in the format bar. */
  start(
    node: RootContent | (ProseHost & { type: string }),
    el: Element,
    path: IndexPath,
    opts?: { inline?: boolean; at?: { x: number; y: number }; label?: string },
  ): void;
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

const hasChildren = (node: unknown): node is Parent =>
  !!node && typeof node === "object" && Array.isArray((node as Parent).children);

export function createProseController(deps: ProseControllerDeps): ProseController {
  const { formatHost, overlays, canvas, docs, onChange, markDirty, onStart } = deps;
  let session:
    | {
        handle: ProseEditorHandle;
        el: Element;
        path: IndexPath;
        inline: boolean;
        label?: string;
      }
    | undefined;

  function showFormatBar(el: Element): void {
    formatHost.style.top = `${Math.max(overlays.surfaceTop(el) - 42, 6)}px`;
    formatHost.style.left = `${overlays.surfaceLeft(el)}px`;
    formatHost.style.display = "block";
    const view = () => session?.handle.view;
    render(
      <FormatBar
        label={session?.label}
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

  /** Inline-component editing: mount over the element itself, syncing its phrasing children. */
  function startInline(node: ProseHost, el: Element): ProseEditorHandle {
    el.classList.add("nocms-prose-inline");
    el.replaceChildren();
    return mountProseEditor(el, {
      inline: true,
      blocks: [{ type: "paragraph", children: node.children }],
      onChange: (blocks) => {
        node.children = (blocks[0] as Paragraph)?.children ?? [];
        onChange?.(docs.serialize());
        markDirty();
      },
    });
  }

  /** Block editing: replace the rendered block with an editor host, and keep the mdast in sync by
   *  replacing the block's (growing) span in its parent on every change. */
  function startBlock(
    node: RootContent,
    el: Element,
    path: IndexPath,
  ): {
    handle: ProseEditorHandle;
    host: HTMLElement;
  } {
    const host = document.createElement("div");
    host.className = "nocms-prose-host";
    el.replaceWith(host);
    const parentPath = path.slice(0, -1);
    const startIndex = path[path.length - 1] ?? 0;
    let span = 1;
    const handle = mountProseEditor(host, {
      blocks: [node],
      onChange: (blocks) => {
        const parent = nodeAtIndexPath(docs.doc, parentPath);
        if (hasChildren(parent)) {
          parent.children.splice(startIndex, span, ...(blocks as RootContent[]));
          span = blocks.length;
        }
        onChange?.(docs.serialize());
        markDirty();
      },
    });
    return { handle, host };
  }

  return {
    isActive: () => session !== undefined,
    view: () => session?.handle.view,
    containsEl: (el) => session?.el.contains(el) ?? false,

    start(node, el, path, opts = {}) {
      const { inline = false, at, label } = opts;
      canvas.highlight(undefined);
      overlays.clearHover();
      // The block's name moves into the format bar, so drop the standalone selection chip.
      overlays.showSelectionLabel(undefined, undefined);

      const { handle, mountEl } = inline
        ? { handle: startInline(node as ProseHost, el), mountEl: el }
        : (() => {
            const r = startBlock(node as RootContent, el, path);
            return { handle: r.handle, mountEl: r.host };
          })();

      if (at) handle.caretAt(at.x, at.y);
      else handle.view.focus();
      session = { handle, el: mountEl, path, inline, label };
      onStart();
      showFormatBar(mountEl);
    },

    async commit() {
      if (!session) return undefined;
      const { handle, path } = session;
      session = undefined;
      handle.destroy();
      hideFormatBar();
      // The mdast already holds the edit (synced per change); repaint from it and re-select.
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
