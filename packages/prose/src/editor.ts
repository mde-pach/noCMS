import type { PhrasingContent } from "mdast";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { proseSchema } from "./schema.js";
import { docToMdastInline, mdastInlineToDoc, requireMark } from "./transform.js";

export interface ProseEditorOptions {
  nodes: PhrasingContent[];
  /** Fired only on doc-changing edits, with the updated inline content. */
  onChange: (nodes: PhrasingContent[]) => void;
}

export interface ProseEditorHandle {
  /** Escape hatch for the host: toolbar wiring, focus. */
  readonly view: EditorView;
  destroy(): void;
}

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
