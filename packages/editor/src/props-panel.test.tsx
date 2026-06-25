// @vitest-environment happy-dom

import { type ControlDescriptor, deriveControls } from "@nocms/core";
import { render } from "preact";
import * as v from "valibot";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getProp, isJsxElement, type JsxElement } from "./jsx-attributes.js";
import { parseMdx } from "./mdx-document.js";
import { PropsPanel } from "./props-panel.js";

// Controls derive from a valibot schema — exactly as the shell derives them live.
const controls: ControlDescriptor[] = deriveControls(
  v.object({
    label: v.string(),
    variant: v.optional(v.picklist(["primary", "secondary"])),
    count: v.optional(v.number()),
    dark: v.optional(v.boolean()),
    // a nested group: structural, not an attribute field → excluded from the panel.
    meta: v.optional(v.object({ id: v.string() })),
  }),
);

function buttonElement(mdx: string): JsxElement {
  const node = parseMdx(mdx).children[0];
  if (!node || !isJsxElement(node)) throw new Error("expected a JSX element");
  return node;
}

function field(container: Element, name: string): HTMLInputElement & HTMLSelectElement {
  const el = container.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`no field ${name}`);
  return el as HTMLInputElement & HTMLSelectElement;
}

let container: HTMLElement;
let element: JsxElement;
let onChange: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  element = buttonElement(`<Button label="Go" variant="primary" />\n`);
  onChange = vi.fn<() => void>();
  render(
    <PropsPanel
      element={element}
      component="Button"
      controls={controls}
      onChange={onChange}
    />,
    container,
  );
});

describe("PropsPanel", () => {
  test("renders the component name and one field per scalar control", () => {
    expect(container.querySelector(".nocms-props-title")?.textContent).toBe("Button");
    // text, select, number, boolean — the nested group is excluded.
    expect(container.querySelectorAll(".nocms-field").length).toBe(4);
  });

  test("shows current prop values", () => {
    expect(field(container, "label").value).toBe("Go");
    expect(field(container, "variant").value).toBe("primary");
  });

  test("editing text writes the attribute and notifies", () => {
    const input = field(container, "label");
    input.value = "Stop";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(getProp(element, "label")).toBe("Stop");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test("clearing a text field removes the attribute", () => {
    const input = field(container, "label");
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(getProp(element, "label")).toBeUndefined();
  });

  test("number fields write a numeric value", () => {
    const input = field(container, "count");
    input.value = "5";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(getProp(element, "count")).toBe(5);
  });

  test("toggling a boolean writes true", () => {
    const input = field(container, "dark");
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(getProp(element, "dark")).toBe(true);
  });

  test("selecting an option writes the choice", () => {
    const select = field(container, "variant");
    select.value = "secondary";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(getProp(element, "variant")).toBe("secondary");
  });
});
