// @vitest-environment happy-dom

import type { ComponentRegistry } from "@nocms/components";
import { type ComponentType, h } from "preact";
import * as v from "valibot";
import { describe, expect, test, vi } from "vitest";
import { mountEditor } from "./shell.js";

const Button: ComponentType<Record<string, unknown>> = (props) =>
  h("a", { class: "btn" }, props.label as string);

// Each block carries its valibot props schema; the panel derives controls from it.
const components: ComponentRegistry = {
  Button: {
    component: Button as unknown as ComponentRegistry[string]["component"],
    schema: v.object({ label: v.string() }),
  },
};

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
