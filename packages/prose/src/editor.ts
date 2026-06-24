import type { PhrasingContent } from "mdast";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { proseSchema } from "./schema.js";
import { docToMdastInline, mdastInlineToDoc, requireMark } from "./transform.js";

export interface ProseEditorOptions {
  /** The prose block's inline children — the edit's starting content. */
  nodes: PhrasingContent[];
  /** Fired on every doc-changing edit with the updated inline content. */
  onChange: (nodes: PhrasingContent[]) => void;
}

export interface ProseEditorHandle {
  /** The live ProseMirror view — an escape hatch for the host (toolbar wiring, focus). */
  readonly view: EditorView;
  destroy(): void;
}

/**
 * Mount a transient ProseMirror editor over a prose span's inline content. The view owns its
 * own undo/redo history (scoped to this span) and a small mark keymap; every doc-changing
 * transaction re-serializes the doc to mdast and calls `onChange`, so the host can splice the
 * result back into its document. The host owns `target`; `destroy()` tears the view down.
 */
export function mountProseEditor(
  target: Element,
  { nodes, onChange }: ProseEditorOptions,
): ProseEditorHandle {
  const state = EditorState.create({
    doc: mdastInlineToDoc(nodes, proseSchema),
    plugins: [
      history(),
      keymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Shift-Mod-z": redo,
        "Mod-b": toggleMark(requireMark(proseSchema, "strong")),
        "Mod-i": toggleMark(requireMark(proseSchema, "em")),
        "Mod-`": toggleMark(requireMark(proseSchema, "code")),
      }),
      keymap(baseKeymap),
    ],
  });

  const view = new EditorView(target, {
    state,
    dispatchTransaction(tr) {
      const next = view.state.apply(tr);
      view.updateState(next);
      if (tr.docChanged) onChange(docToMdastInline(next.doc));
    },
  });

  return {
    view,
    destroy() {
      view.destroy();
    },
  };
}
