import { lift, setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { liftListItem, wrapInList } from "prosemirror-schema-list";
import type { Command, EditorState } from "prosemirror-state";
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

// The block kinds the panel offers — the same vocabulary the document tree uses, so the panel reads
// and drives the *live* editor selection (one mechanism), never a separate convert-the-block path.
export type ProseBlockName =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "bulleted"
  | "numbered"
  | "todo"
  | "quote";

const N = proseSchema.nodes;

/** The block kind at the selection — the deepest meaningful container, so a paragraph inside a list
 *  reads as the list, and a checkbox item reads as a task list. */
export function currentProseBlock(state: EditorState): ProseBlockName {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type === N.listItem && node.attrs.checked !== null) return "todo";
    if (node.type === N.bulletList) return "bulleted";
    if (node.type === N.orderedList) return "numbered";
    if (node.type === N.blockquote) return "quote";
    if (node.type === N.heading) return `h${node.attrs.level}` as ProseBlockName;
  }
  return "paragraph";
}

const isList = (name: ProseBlockName): boolean =>
  name === "bulleted" || name === "numbered" || name === "todo";

/** Mark every list item in the current selection as a (unchecked) task item, in one transaction. */
function markTaskItems(view: EditorView): void {
  const { tr, selection } = view.state;
  let changed = false;
  view.state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (node.type === N.listItem && node.attrs.checked === null) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked: false });
      changed = true;
    }
  });
  if (changed) view.dispatch(tr);
}

/** Lift the selection out of every list/blockquote wrapper and reset it to a plain paragraph — the
 *  clean base every target is built from, so converting a list straight to a heading or quote works
 *  (a list item can't directly hold a heading, and a quote can't wrap a list item). */
function normalizeToParagraph(view: EditorView): void {
  // Each successful command dispatches and updates view.state, so the loop re-reads fresh state.
  while (
    liftListItem(N.listItem)(view.state, view.dispatch) ||
    lift(view.state, view.dispatch)
  ) {
    /* keep lifting until at the top level */
  }
  setBlockType(N.paragraph)(view.state, view.dispatch);
}

/** Apply a block kind to the live editor selection. Re-applying the active list/quote toggles back to
 *  a paragraph; otherwise the selection is normalised to a paragraph and rebuilt in the target shape. */
export function setProseBlock(view: EditorView, name: ProseBlockName): void {
  const current = currentProseBlock(view.state);
  const run = (cmd: Command) => cmd(view.state, view.dispatch);

  // toggle off, or "make paragraph" → just normalise out of any list/quote
  if (
    name === "paragraph" ||
    (name === current && (name === "quote" || isList(name)))
  ) {
    normalizeToParagraph(view);
    view.focus();
    return;
  }

  normalizeToParagraph(view);
  switch (name) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      run(setBlockType(N.heading, { level: Number(name.slice(1)) }));
      break;
    case "bulleted":
      run(wrapInList(N.bulletList));
      break;
    case "numbered":
      run(wrapInList(N.orderedList));
      break;
    case "todo":
      run(wrapInList(N.bulletList));
      markTaskItems(view);
      break;
    case "quote":
      run(wrapIn(N.blockquote));
      break;
  }
  view.focus();
}
