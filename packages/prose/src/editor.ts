import type { RootContent } from "mdast";
import { baseKeymap, setBlockType, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import {
  inputRules,
  textblockTypeInputRule,
  wrappingInputRule,
} from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import { liftListItem, sinkListItem, splitListItem } from "prosemirror-schema-list";
import type { Command } from "prosemirror-state";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { proseSchema } from "./schema.js";
import { docToMdast, mdastToDoc, requireMark } from "./transform.js";

export interface ProseEditorOptions {
  /** The run of mdast blocks to edit (one or more — Enter grows the run). */
  blocks: RootContent[];
  /** Fired on every doc-changing edit, with the updated run of blocks. */
  onChange: (blocks: RootContent[]) => void;
}

export interface ProseEditorHandle {
  /** Escape hatch for the host: toolbar wiring, focus. */
  readonly view: EditorView;
  /** Place the caret at viewport coordinates (a click point), so editing begins exactly where the
   *  user clicked instead of at a default position. No-op when the point maps to nothing. */
  caretAt(clientX: number, clientY: number): void;
  destroy(): void;
}

const N = proseSchema.nodes;

/** Insert a hard line break (Shift-Enter) — a soft `<br>` within the same block. */
const insertHardBreak: Command = (state, dispatch) => {
  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(N.break.create()).scrollIntoView());
  }
  return true;
};

// Markdown-style shortcuts: typing the prefix transforms the current block, the way every editor the
// owner already knows works. Lists/blockquote wrap; `#` sets a heading level.
const markdownInputRules = inputRules({
  rules: [
    wrappingInputRule(/^\s*([-+*])\s$/, N.bulletList),
    wrappingInputRule(
      /^(\d+)\.\s$/,
      N.orderedList,
      (match) => ({ start: Number(match[1]) }),
      (match, node) =>
        node.childCount + (node.attrs.start as number) === Number(match[1]),
    ),
    wrappingInputRule(/^\s*>\s$/, N.blockquote),
    textblockTypeInputRule(/^(#{1,6})\s$/, N.heading, (match) => ({
      level: match[1]?.length ?? 1,
    })),
  ],
});

function editorKeymap() {
  const item = N.listItem;
  return keymap({
    "Mod-z": undo,
    "Mod-y": redo,
    "Shift-Mod-z": redo,
    "Mod-b": toggleMark(requireMark(proseSchema, "strong")),
    "Mod-i": toggleMark(requireMark(proseSchema, "em")),
    "Shift-Mod-x": toggleMark(requireMark(proseSchema, "strikethrough")),
    "Mod-`": toggleMark(requireMark(proseSchema, "code")),
    // Enter splits the list item (lifting out of an empty one) when in a list; otherwise it falls
    // through to baseKeymap, which splits the paragraph/heading into a new block.
    Enter: splitListItem(item),
    "Shift-Enter": insertHardBreak,
    Tab: sinkListItem(item),
    "Shift-Tab": liftListItem(item),
    "Mod-]": sinkListItem(item),
    "Mod-[": liftListItem(item),
    // Heading levels and back to body text, the usual Docs/Word chords.
    "Shift-Mod-0": setBlockType(N.paragraph),
    "Shift-Mod-1": setBlockType(N.heading, { level: 1 }),
    "Shift-Mod-2": setBlockType(N.heading, { level: 2 }),
    "Shift-Mod-3": setBlockType(N.heading, { level: 3 }),
  });
}

export function mountProseEditor(
  target: Element,
  { blocks, onChange }: ProseEditorOptions,
): ProseEditorHandle {
  const state = EditorState.create({
    doc: mdastToDoc(blocks, proseSchema),
    plugins: [history(), markdownInputRules, editorKeymap(), keymap(baseKeymap)],
  });

  const view = new EditorView(target, {
    state,
    dispatchTransaction(tr) {
      const next = view.state.apply(tr);
      view.updateState(next);
      if (tr.docChanged) onChange(docToMdast(next.doc));
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
