// @vitest-environment happy-dom

import type { ComponentRegistry } from "@nocms/components";
import { type ComponentType, h } from "preact";
import * as v from "valibot";
import { describe, expect, test, vi } from "vitest";
import { mountEditor } from "./shell.js";

const Button: ComponentType<Record<string, unknown>> = (props) =>
  h("a", { class: "btn" }, props.label as string);
const Image: ComponentType<Record<string, unknown>> = () => h("img", { class: "img" });
const Stack: ComponentType<Record<string, unknown>> = (props) =>
  h("div", { class: "stack" }, props.children as never);

const asComponent = (c: ComponentType<Record<string, unknown>>) =>
  c as unknown as ComponentRegistry[string]["component"];

// Each block carries its valibot props schema; the panel derives controls from it.
const components: ComponentRegistry = {
  Button: {
    component: asComponent(Button),
    schema: v.object({ label: v.string() }),
  },
  Image: { component: asComponent(Image) },
  Stack: { component: asComponent(Stack), slots: ["children"] },
};

function labels(target: Element): string[] {
  return [...target.querySelectorAll(".nocms-editor-canvas .btn")].map(
    (el) => el.textContent ?? "",
  );
}

function selectFirst(target: Element, selector: string): Element {
  const el = target.querySelector(`.nocms-editor-canvas ${selector}`);
  if (!el) throw new Error(`no ${selector} on canvas`);
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return el;
}

function panelField(target: Element, name: string): HTMLInputElement {
  const el = target.querySelector(`.nocms-editor-panel [name="${name}"]`);
  if (!el) throw new Error(`no panel field ${name}`);
  return el as HTMLInputElement;
}

describe("mountEditor", () => {
  test("click → props panel → edit → live canvas update → onChange", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onChange = vi.fn();

    const handle = await mountEditor({
      target,
      mdx: `<Button label="Go" />\n`,
      components,
      onChange,
    });

    const canvas = target.querySelector(".nocms-editor-canvas");
    if (!canvas) throw new Error("no canvas region");
    const button = canvas.querySelector(".btn");
    if (!button) throw new Error("button did not render");
    expect(button.textContent).toBe("Go");

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // The panel renders the Button's controls and shows an overlay for the selection.
    expect(target.querySelector(".nocms-props-title")?.textContent).toBe("Button");
    expect(target.querySelector(".nocms-overlay")).not.toBeNull();

    const label = panelField(target, "label");
    expect(label.value).toBe("Go");
    label.value = "Stop";
    label.dispatchEvent(new Event("input", { bubbles: true }));

    await vi.waitFor(() => {
      expect(target.querySelector(".nocms-editor-canvas .btn")?.textContent).toBe(
        "Stop",
      );
    });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0]).toContain('label="Stop"');
    // The selection survives the re-render: the overlay is re-applied.
    expect(target.querySelector(".nocms-overlay")).not.toBeNull();

    handle.dispose();
    expect(target.querySelector(".nocms-editor")).toBeNull();
  });

  test("clicking empty space clears the panel and overlay", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const handle = await mountEditor({
      target,
      mdx: `<Button label="Go" />\n\nPlain prose with no component.\n`,
      components,
    });

    const button = target.querySelector(".nocms-editor-canvas .btn");
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(target.querySelector(".nocms-props-title")).not.toBeNull();

    // A click resolving to no annotated element deselects.
    const canvas = target.querySelector(".nocms-editor-canvas");
    canvas?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(target.querySelector(".nocms-props-title")).toBeNull();
    expect(target.querySelector(".nocms-overlay")).toBeNull();

    handle.dispose();
  });

  test("themes the canvas live from the design panel and round-trips tokens", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onTokensChange = vi.fn();

    const handle = await mountEditor({
      target,
      mdx: `# Hi\n`,
      components,
      tokens: "color.brand.500: #3b82f6\nspace.md: 1rem\n",
      onTokensChange,
    });

    const styles = [...target.querySelectorAll("style")].map(
      (s) => s.textContent ?? "",
    );
    expect(styles.some((c) => c.includes("--color-brand-500: #3b82f6;"))).toBe(true);

    const brand = target.querySelector('[name="color.brand.500"]') as HTMLInputElement;
    brand.value = "#ff0000";
    brand.dispatchEvent(new Event("input", { bubbles: true }));

    const themed = [...target.querySelectorAll("style")].map(
      (s) => s.textContent ?? "",
    );
    expect(themed.some((c) => c.includes("--color-brand-500: #ff0000;"))).toBe(true);
    expect(onTokensChange).toHaveBeenCalledWith(
      expect.stringContaining("color.brand.500: #ff0000"),
    );

    handle.dispose();
  });

  test("double-click a paragraph → edit text in place → commit updates the doc", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onChange = vi.fn();

    const handle = await mountEditor({
      target,
      mdx: `Edit me here.\n`,
      components,
      onChange,
    });

    const canvas = target.querySelector(".nocms-editor-canvas");
    if (!canvas) throw new Error("no canvas");
    const para = canvas.querySelector("p");
    if (!para) throw new Error("paragraph did not render");

    para.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    // A prose editor mounts in place; the props overlay steps aside.
    expect(canvas.querySelector(".ProseMirror")).not.toBeNull();
    expect(handle.proseView()).toBeDefined();
    expect(target.querySelector(".nocms-overlay")).toBeNull();

    // Edit through the live view (the host's escape hatch); the doc splices live.
    const view = handle.proseView();
    if (!view) throw new Error("no prose view");
    const end = view.state.doc.content.size;
    view.dispatch(view.state.tr.insertText(" Edited!", end, end));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0]).toContain("Edit me here. Edited!");

    // Escape commits: the view tears down, the canvas re-renders, the block re-selects.
    canvas.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await vi.waitFor(() => {
      expect(target.querySelector(".ProseMirror")).toBeNull();
      expect(target.querySelector(".nocms-editor-canvas p")?.textContent).toBe(
        "Edit me here. Edited!",
      );
    });
    expect(handle.proseView()).toBeUndefined();
    expect(target.querySelector(".nocms-overlay")).not.toBeNull();

    handle.dispose();
  });

  test("clicking another element commits an active prose edit", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const handle = await mountEditor({
      target,
      mdx: `# A heading\n\nSome prose.\n`,
      components,
    });

    const canvas = target.querySelector(".nocms-editor-canvas");
    const para = canvas?.querySelector("p");
    para?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(canvas?.querySelector(".ProseMirror")).not.toBeNull();

    // Clicking the heading (outside the active block) commits, then selects it.
    const heading = canvas?.querySelector("h1");
    heading?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(target.querySelector(".ProseMirror")).toBeNull();
      expect(handle.proseView()).toBeUndefined();
    });

    handle.dispose();
  });

  test("selecting a block with no schema shows the empty state", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const handle = await mountEditor({
      target,
      mdx: `# A heading\n`,
      components,
    });

    const heading = target.querySelector(".nocms-editor-canvas h1");
    heading?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    // A heading is selectable but has no component schema → empty state, with overlay.
    expect(target.querySelector(".nocms-empty")).not.toBeNull();
    expect(target.querySelector(".nocms-overlay")).not.toBeNull();

    handle.dispose();
  });
});

const TWO = `<Button label="A" />\n\n<Button label="B" />\n`;

describe("structural editing (D15 tree-transforms)", () => {
  test("toolbar reorders the selected block among its siblings", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onChange = vi.fn();
    const handle = await mountEditor({ target, mdx: TWO, components, onChange });

    selectFirst(target, ".btn"); // select Button "A"
    expect(target.querySelector(".nocms-tool-tag")?.textContent).toBe("Button");

    target
      .querySelector(".nocms-tool-down")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await vi.waitFor(() => expect(labels(target)).toEqual(["B", "A"]));
    expect(onChange).toHaveBeenCalled();
    // The moved block stays selected so it can be nudged again.
    expect(handle.selection()).toEqual([1]);
    handle.dispose();
  });

  test("Alt+ArrowUp moves the selected block up", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const handle = await mountEditor({ target, mdx: TWO, components });

    // Select the second button ("B").
    target
      .querySelectorAll(".nocms-editor-canvas .btn")[1]
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handle.selection()).toEqual([1]);

    target
      .querySelector(".nocms-editor-canvas")
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowUp", altKey: true, bubbles: true }),
      );

    await vi.waitFor(() => expect(labels(target)).toEqual(["B", "A"]));
    handle.dispose();
  });

  test("delete removes the selected block (toolbar) and the Delete key", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const handle = await mountEditor({ target, mdx: TWO, components });

    selectFirst(target, ".btn"); // "A"
    target
      .querySelector(".nocms-tool-delete")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => expect(labels(target)).toEqual(["B"]));

    selectFirst(target, ".btn"); // "B"
    target
      .querySelector(".nocms-editor-canvas")
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    await vi.waitFor(() => expect(labels(target)).toEqual([]));
    handle.dispose();
  });

  test('a "+" handle opens the palette and inserts the chosen block', async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const handle = await mountEditor({
      target,
      mdx: `<Button label="A" />\n`,
      components,
    });

    // One block → two gaps. Insert at the top (gap 0).
    const handles = target.querySelectorAll(".nocms-insert-handle");
    expect(handles.length).toBe(2);
    handles[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const palette = target.querySelector(".nocms-palette");
    expect(palette).not.toBeNull();
    const image = [...target.querySelectorAll(".nocms-palette-item")].find((b) =>
      b.textContent?.includes("Image"),
    );
    image?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await vi.waitFor(() => {
      expect(target.querySelector(".nocms-editor-canvas .img")).not.toBeNull();
      expect(target.querySelector(".nocms-palette")).toBeNull();
    });
    // Inserted at the top: the new block is selected.
    expect(handle.selection()).toEqual([0]);
    handle.dispose();
  });

  test('the "/" key opens the palette; Enter inserts the top match', async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const handle = await mountEditor({
      target,
      mdx: `<Button label="A" />\n`,
      components,
    });

    target
      .querySelector(".nocms-editor-canvas")
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true }));
    const search = target.querySelector(".nocms-palette-search") as HTMLInputElement;
    expect(search).not.toBeNull();
    search.value = "Image";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    // The filtered list re-renders asynchronously; wait until "Image" is the top match
    // before pressing Enter, which inserts it.
    await vi.waitFor(() => {
      const items = target.querySelectorAll(".nocms-palette-item");
      expect(items.length).toBe(1);
      expect(items[0]?.textContent).toContain("Image");
    });
    search.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    await vi.waitFor(() =>
      expect(target.querySelector(".nocms-editor-canvas .img")).not.toBeNull(),
    );
    handle.dispose();
  });

  test("undo and redo walk every edit through one stack", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onChange = vi.fn();
    const handle = await mountEditor({ target, mdx: TWO, components, onChange });

    selectFirst(target, ".btn");
    target
      .querySelector(".nocms-tool-down")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => expect(labels(target)).toEqual(["B", "A"]));

    handle.undo();
    await vi.waitFor(() => expect(labels(target)).toEqual(["A", "B"]));

    handle.redo();
    await vi.waitFor(() => expect(labels(target)).toEqual(["B", "A"]));
    handle.dispose();
  });

  test("Ctrl+Z undoes; the last onChange is the reverted MDX", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onChange = vi.fn();
    const handle = await mountEditor({ target, mdx: TWO, components, onChange });

    selectFirst(target, ".btn");
    target
      .querySelector(".nocms-tool-delete")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => expect(labels(target)).toEqual(["B"]));

    target
      .querySelector(".nocms-editor-canvas")
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }),
      );
    await vi.waitFor(() => expect(labels(target)).toEqual(["A", "B"]));
    expect(onChange.mock.calls.at(-1)?.[0]).toContain('label="A"');
    handle.dispose();
  });
});
