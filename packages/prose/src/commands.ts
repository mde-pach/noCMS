import { toggleMark } from "prosemirror-commands";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { proseSchema } from "./schema.js";
import { requireMark } from "./transform.js";

export type ProseMarkName = "strong" | "em" | "strikethrough" | "code" | "link";

export function toggleProseMark(
  view: EditorView,
  name: ProseMarkName,
  attrs?: Record<string, unknown>,
): void {
  toggleMark(requireMark(proseSchema, name), attrs)(view.state, view.dispatch);
  view.focus();
}

export function isMarkActive(state: EditorState, name: ProseMarkName): boolean {
  const mark = proseSchema.marks[name];
  if (!mark) return false;
  const { from, $from, to, empty } = state.selection;
  if (empty) return !!mark.isInSet(state.storedMarks ?? $from.marks());
  return state.doc.rangeHasMark(from, to, mark);
}
