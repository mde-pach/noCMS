// @vitest-environment happy-dom
import type { PhrasingContent } from "mdast";
import { toggleMark } from "prosemirror-commands";
import { TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vitest";
import { mountProseEditor } from "./editor.js";
import { proseSchema } from "./schema.js";
import { requireMark } from "./transform.js";

const text = (value: string): PhrasingContent => ({ type: "text", value });

let target: HTMLElement | undefined;
afterEach(() => {
  target?.remove();
  target = undefined;
});

function mount(nodes: PhrasingContent[]) {
  target = document.createElement("div");
  document.body.appendChild(target);
  const changes: PhrasingContent[][] = [];
  const handle = mountProseEditor(target, { nodes, onChange: (n) => changes.push(n) });
  return { target, handle, changes };
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
    expect(jsxChip?.textContent).toContain("Badge");
    expect(exprChip?.textContent).toBe("{user.name}");
  });

  it("emits bold mdast after selecting all and toggling strong", () => {
    const { handle, changes } = mount([text("bold me")]);
    const { view } = handle;
    const all = TextSelection.create(view.state.doc, 0, view.state.doc.content.size);
    view.dispatch(view.state.tr.setSelection(all));
    toggleMark(requireMark(proseSchema, "strong"))(view.state, view.dispatch);

    expect(changes.at(-1)).toEqual([{ type: "strong", children: [text("bold me")] }]);
  });

  it("emits updated mdast when text is inserted", () => {
    const { handle, changes } = mount([text("hi")]);
    const { view } = handle;
    const end = view.state.doc.content.size;
    view.dispatch(view.state.tr.insertText("!", end, end));

    expect(changes.at(-1)).toEqual([text("hi!")]);
  });

  it("preserves an inline atom through an unrelated text edit", () => {
    const { handle, changes } = mount([
      text("x "),
      { type: "mdxTextExpression", value: "count" } as unknown as PhrasingContent,
    ]);
    const { view } = handle;
    view.dispatch(view.state.tr.insertText("y", 1, 1));

    expect(changes.at(-1)).toEqual([
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
});
