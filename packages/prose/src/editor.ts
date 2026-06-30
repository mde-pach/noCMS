import type { PhrasingContent } from "mdast";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { EditorState, TextSelection } from "prosemirror-state";
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
  /** Place the caret at viewport coordinates (a click point), so editing begins exactly where the
   *  user clicked instead of at a default position. No-op when the point maps to nothing. */
  caretAt(clientX: number, clientY: number): void;
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
        "Shift-Mod-x": toggleMark(requireMark(proseSchema, "strikethrough")),
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
    caretAt(clientX, clientY) {
      const found = view.posAtCoords({ left: clientX, top: clientY });
      if (!found) return;
      const sel = TextSelection.near(view.state.doc.resolve(found.pos));
      view.dispatch(view.state.tr.setSelection(sel));
      view.focus();
    },
    destroy() {
      view.destroy();
    },
  };
}
