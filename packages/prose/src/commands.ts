// Mark commands for the host's formatting toolbar. The prose view already binds Mod-b/i/`;
// these expose the same toggles to a floating bar, and `isMarkActive` lets the bar reflect
// the selection's current marks. Keeping ProseMirror's command layer here means the editor's
// toolbar never imports prosemirror-* directly — it speaks marks by name.

import { toggleMark } from "prosemirror-commands";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { proseSchema } from "./schema.js";
import { requireMark } from "./transform.js";

export type ProseMarkName = "strong" | "em" | "code" | "link";

/** Toggle a mark over the current selection and return focus to the view. */
export function toggleProseMark(
  view: EditorView,
  name: ProseMarkName,
  attrs?: Record<string, unknown>,
): void {
  toggleMark(requireMark(proseSchema, name), attrs)(view.state, view.dispatch);
  view.focus();
}

/** Whether the selection carries `name` — for a pressed toolbar button. */
export function isMarkActive(state: EditorState, name: ProseMarkName): boolean {
  const mark = proseSchema.marks[name];
  if (!mark) return false;
  const { from, $from, to, empty } = state.selection;
  if (empty) return !!mark.isInSet(state.storedMarks ?? $from.marks());
  return state.doc.rangeHasMark(from, to, mark);
}
