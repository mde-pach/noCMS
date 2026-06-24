// @vitest-environment happy-dom

import type { ComponentRegistry } from "@nocms/components";
import type { ComponentSchema } from "@nocms/props-discovery";
import { type ComponentType, h } from "preact";
import { describe, expect, test, vi } from "vitest";
import { mountEditor } from "./shell.js";

const Button: ComponentType<Record<string, unknown>> = (props) =>
  h("a", { class: "btn" }, props.label as string);

const components: ComponentRegistry = {
  Button: { component: Button as unknown as ComponentRegistry[string]["component"] },
};

const schemas: Record<string, ComponentSchema> = {
  Button: {
    component: "Button",
    controls: [{ prop: "label", kind: "text", required: true }],
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
      schemas,
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
      schemas,
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

  test("selecting a block with no schema shows the empty state", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const handle = await mountEditor({
      target,
      mdx: `# A heading\n`,
      components,
      schemas,
    });

    const heading = target.querySelector(".nocms-editor-canvas h1");
    heading?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    // A heading is selectable but has no component schema → empty state, with overlay.
    expect(target.querySelector(".nocms-empty")).not.toBeNull();
    expect(target.querySelector(".nocms-overlay")).not.toBeNull();

    handle.dispose();
  });
});
