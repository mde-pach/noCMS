// @vitest-environment happy-dom
import type { Paragraph, PhrasingContent, RootContent } from "mdast";
import { toggleMark } from "prosemirror-commands";
import { TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vitest";
import { currentProseBlock, setProseBlock } from "./commands.js";
import { mountProseEditor } from "./editor.js";
import { proseSchema } from "./schema.js";
import { requireMark } from "./transform.js";

const text = (value: string): PhrasingContent => ({ type: "text", value });

let target: HTMLElement | undefined;
afterEach(() => {
  target?.remove();
  target = undefined;
});

/** Mount over a single paragraph of `inline` content — the common case, kept terse for the tests. */
function mount(inline: PhrasingContent[]) {
  target = document.createElement("div");
  document.body.appendChild(target);
  const changes: RootContent[][] = [];
  const blocks: RootContent[] = [{ type: "paragraph", children: inline }];
  const handle = mountProseEditor(target, { blocks, onChange: (b) => changes.push(b) });
  return { target, handle, changes };
}

/** The inline content of the last change's first (paragraph) block. */
function lastInline(changes: RootContent[][]): PhrasingContent[] {
  const last = changes.at(-1);
  return last ? (last[0] as Paragraph).children : [];
}

describe("mountProseEditor", () => {
  it("renders prose text into the target", () => {
    const { target } = mount([text("hello world")]);
    expect(target.textContent).toContain("hello world");
  });

  it("renders inline atoms as non-editable chips", () => {
    const { target } = mount([
      text("a "),
      {
        type: "mdxJsxTextElement",
        name: "Badge",
        attributes: [{ type: "mdxJsxAttribute", name: "variant", value: "new" }],
        children: [text("hi")],
      } as unknown as PhrasingContent,
      text(" "),
      { type: "mdxTextExpression", value: "user.name" } as unknown as PhrasingContent,
    ]);
    const jsxChip = target.querySelector(".nocms-prose-atom-jsx");
    const exprChip = target.querySelector(".nocms-prose-atom-expr");
    expect(jsxChip?.getAttribute("contenteditable")).toBe("false");
    // The chip shows the component's actual content ("hi") with a small name tag — not the raw
    // `<Badge variant="new">…</Badge>` source that hid the text behind `…`.
    expect(jsxChip?.querySelector(".nocms-prose-atom-tag")?.textContent).toBe("Badge");
    expect(jsxChip?.textContent).toContain("hi");
    expect(jsxChip?.textContent).not.toContain("…");
    expect(exprChip?.textContent).toBe("{user.name}");
  });

  // The fix is generic: it keys on "an inline JSX element with text content", not on Badge.
  it("shows the content of any inline component, with its name tag", () => {
    const { target } = mount([
      {
        type: "mdxJsxTextElement",
        name: "Pill",
        attributes: [],
        children: [text("Beta")],
      } as unknown as PhrasingContent,
    ]);
    const chip = target.querySelector(".nocms-prose-atom-jsx");
    expect(chip?.querySelector(".nocms-prose-atom-tag")?.textContent).toBe("Pill");
    expect(chip?.textContent).toContain("Beta");
  });

  it("falls back to the source tag for a self-closing (text-less) inline component", () => {
    const { target } = mount([
      {
        type: "mdxJsxTextElement",
        name: "Icon",
        attributes: [{ type: "mdxJsxAttribute", name: "name", value: "star" }],
        children: [],
      } as unknown as PhrasingContent,
    ]);
    const chip = target.querySelector(".nocms-prose-atom-jsx");
    expect(chip?.textContent).toBe('<Icon name="star"/>');
  });

  it("emits bold mdast after selecting all and toggling strong", () => {
    const { handle, changes } = mount([text("bold me")]);
    const { view } = handle;
    const all = TextSelection.create(view.state.doc, 0, view.state.doc.content.size);
    view.dispatch(view.state.tr.setSelection(all));
    toggleMark(requireMark(proseSchema, "strong"))(view.state, view.dispatch);

    expect(lastInline(changes)).toEqual([
      { type: "strong", children: [text("bold me")] },
    ]);
  });

  it("emits updated mdast when text is inserted", () => {
    const { handle, changes } = mount([text("hi")]);
    const { view } = handle;
    const end = view.state.doc.content.size - 1;
    view.dispatch(view.state.tr.insertText("!", end, end));

    expect(lastInline(changes)).toEqual([text("hi!")]);
  });

  it("preserves an inline atom through an unrelated text edit", () => {
    const { handle, changes } = mount([
      text("x "),
      { type: "mdxTextExpression", value: "count" } as unknown as PhrasingContent,
    ]);
    const { view } = handle;
    // Position 2 is just after "x" inside the paragraph (1 = paragraph start, before "x").
    view.dispatch(view.state.tr.insertText("y", 2, 2));

    expect(lastInline(changes)).toEqual([
      text("xy "),
      { type: "mdxTextExpression", value: "count" },
    ]);
  });

  it("does not emit when a transaction makes no doc change", () => {
    const { handle, changes } = mount([text("static")]);
    const { view } = handle;
    const all = TextSelection.create(view.state.doc, 0, view.state.doc.content.size);
    view.dispatch(view.state.tr.setSelection(all));

    expect(changes).toHaveLength(0);
  });

  it("destroy() removes the editor from the target", () => {
    const { target, handle } = mount([text("bye")]);
    expect(target.querySelector(".ProseMirror")).toBeTruthy();
    handle.destroy();
    expect(target.querySelector(".ProseMirror")).toBeFalsy();
  });

  it("Enter splits the paragraph into two blocks", () => {
    const { handle, changes } = mount([text("one two")]);
    const { view } = handle;
    // caret between "one " and "two"
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 5)));
    splitAtSelection(view);
    const blocks = changes.at(-1);
    expect(blocks).toEqual([
      { type: "paragraph", children: [text("one ")] },
      { type: "paragraph", children: [text("two")] },
    ]);
  });

  it("typing '- ' at the start turns the block into a bulleted list", () => {
    const { handle, changes } = mount([]);
    const { view } = handle;
    // an input rule fires on text input, not insertText — simulate the user typing "- "
    typeInto(view, "- ");
    const blocks = changes.at(-1) ?? [];
    expect(blocks[0]?.type).toBe("list");
  });

  it("typing '# ' turns the block into a heading", () => {
    const { handle, changes } = mount([]);
    const { view } = handle;
    typeInto(view, "# ");
    const blocks = changes.at(-1) ?? [];
    expect(blocks[0]).toMatchObject({ type: "heading", depth: 1 });
  });
});

describe("setProseBlock on the live editor", () => {
  it("turns a paragraph into a heading, and back (toggle to paragraph)", () => {
    const { handle } = mount([text("title")]);
    const { view } = handle;
    setProseBlock(view, "h2");
    expect(currentProseBlock(view.state)).toBe("h2");
    expect(view.dom.querySelector("h2")).not.toBeNull();
    setProseBlock(view, "paragraph");
    expect(currentProseBlock(view.state)).toBe("paragraph");
  });

  it("wraps into a list, then converts straight to a quote (list → quote)", () => {
    const { handle } = mount([text("line")]);
    const { view } = handle;
    setProseBlock(view, "bulleted");
    expect(currentProseBlock(view.state)).toBe("bulleted");
    expect(view.dom.querySelector("ul")).not.toBeNull();
    // The fix: converting away from a list normalises out of it first, so no <ul> lingers.
    setProseBlock(view, "quote");
    expect(currentProseBlock(view.state)).toBe("quote");
    expect(view.dom.querySelector("ul")).toBeNull();
    expect(view.dom.querySelector("blockquote")).not.toBeNull();
  });

  it("switches one list type to another", () => {
    const { handle } = mount([text("item")]);
    const { view } = handle;
    setProseBlock(view, "bulleted");
    setProseBlock(view, "numbered");
    expect(currentProseBlock(view.state)).toBe("numbered");
    expect(view.dom.querySelector("ol")).not.toBeNull();
    expect(view.dom.querySelector("ul")).toBeNull();
  });

  it("makes a task list whose items carry checkboxes", () => {
    const { handle, changes } = mount([text("todo")]);
    const { view } = handle;
    setProseBlock(view, "todo");
    expect(currentProseBlock(view.state)).toBe("todo");
    const list = changes.at(-1)?.[0] as { children?: { checked?: boolean }[] };
    expect(list.children?.[0]?.checked).toBe(false);
  });

  it("toggles a list off back to a paragraph", () => {
    const { handle } = mount([text("x")]);
    const { view } = handle;
    setProseBlock(view, "bulleted");
    setProseBlock(view, "bulleted");
    expect(currentProseBlock(view.state)).toBe("paragraph");
    expect(view.dom.querySelector("ul")).toBeNull();
  });
});

/** Run the Enter command (splitListItem → baseKeymap splitBlock) as the keymap would. */
function splitAtSelection(view: import("prosemirror-view").EditorView): void {
  view.someProp("handleKeyDown", (f) =>
    f(view, new KeyboardEvent("keydown", { key: "Enter" })),
  );
}

/** Type characters one at a time through the view's input handling, so input rules fire. */
function typeInto(view: import("prosemirror-view").EditorView, chars: string): void {
  for (const ch of chars) {
    const { from, to } = view.state.selection;
    const deflt = () => view.state.tr.insertText(ch, from, to);
    const handled = view.someProp("handleTextInput", (f) =>
      f(view, from, to, ch, deflt),
    );
    if (!handled) view.dispatch(deflt());
  }
}
