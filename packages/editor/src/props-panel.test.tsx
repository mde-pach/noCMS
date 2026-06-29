// @vitest-environment happy-dom

import { type ControlDescriptor, deriveControls } from "@nocms/controls";
import { render } from "preact";
import * as v from "valibot";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
    // a nested group: rendered as an editable group of its child fields.
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

function segOption(container: Element, name: string, value: string): HTMLElement {
  const el = container.querySelector(`[name="${name}"][value="${value}"]`);
  if (!el) throw new Error(`no option ${name}=${value}`);
  return el as HTMLElement;
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

afterEach(() => {
  // Focus persists on the document across renders, so leftover state would leak between tests.
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.innerHTML = "";
});

describe("PropsPanel", () => {
  test("renders the component name and a field per control, groups included", () => {
    expect(container.querySelector(".nocms-props-title")?.textContent).toBe("Button");
    // text, select, number, boolean + the nested group's `id` field = 5; the group is editable.
    expect(container.querySelectorAll(".nc-field").length).toBe(5);
    expect(container.querySelector(".nc-group")).not.toBeNull();
  });

  test("shows current prop values", () => {
    expect(field(container, "label").value).toBe("Go");
    // a 2-option select renders as a segmented control; the active option is pressed.
    expect(
      segOption(container, "variant", "primary").getAttribute("aria-pressed"),
    ).toBe("true");
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
    // boolean renders as a toggle switch; clicking it flips the value.
    field(container, "dark").click();
    expect(getProp(element, "dark")).toBe(true);
  });

  test("selecting an option writes the choice and moves the active segment", async () => {
    segOption(container, "variant", "secondary").click();
    expect(getProp(element, "variant")).toBe("secondary");
    // The panel re-reads the node so the segmented control reflects the new value.
    await vi.waitFor(() => {
      expect(
        segOption(container, "variant", "secondary").getAttribute("aria-pressed"),
      ).toBe("true");
      expect(
        segOption(container, "variant", "primary").getAttribute("aria-pressed"),
      ).toBe("false");
    });
  });
});

describe("PropsPanel content focus", () => {
  const renderWith = (focus?: { path: string; nonce: number }) => {
    const el = buttonElement(`<Button label="Go" variant="primary" />\n`);
    render(
      <PropsPanel
        element={el}
        component="Button"
        controls={controls}
        focus={focus}
        onChange={vi.fn()}
      />,
      container,
    );
    return el;
  };

  test("focuses and selects the field matching the focus path", () => {
    renderWith({ path: "label", nonce: 1 });
    const input = field(container, "label");
    expect(document.activeElement).toBe(input);
  });

  test("re-focuses the same field when only the nonce changes", () => {
    renderWith({ path: "label", nonce: 1 });
    const input = field(container, "label");
    input.blur();
    expect(document.activeElement).not.toBe(input);
    // A second click on the same content: same path, fresh nonce — focus must return.
    render(
      <PropsPanel
        element={element}
        component="Button"
        controls={controls}
        focus={{ path: "label", nonce: 2 }}
        onChange={vi.fn()}
      />,
      container,
    );
    expect(document.activeElement).toBe(field(container, "label"));
  });

  test("a non-matching focus path leaves focus untouched", () => {
    renderWith({ path: "nope", nonce: 1 });
    expect((document.activeElement as HTMLElement).tagName).not.toBe("INPUT");
  });
});

describe("PropsPanel array focus", () => {
  const listControls = deriveControls(
    v.object({
      items: v.optional(v.array(v.object({ title: v.string() }))),
    }),
  );

  test("auto-expands the targeted array item and focuses its nested field", async () => {
    const el = buttonElement(
      `<Cards items={[{"title":"A"},{"title":"B"},{"title":"C"}]} />\n`,
    );
    render(
      <PropsPanel
        element={el}
        component="Cards"
        controls={listControls}
        focus={{ path: "items.2.title", nonce: 1 }}
        onChange={vi.fn()}
      />,
      container,
    );
    // The item expands in an effect, then its field focuses — both after commit.
    await vi.waitFor(() => {
      const active = document.activeElement as HTMLInputElement;
      expect(active.tagName).toBe("INPUT");
      expect(active.value).toBe("C");
    });
  });
});

// Every control carries its dotted path and lights up when it mirrors the canvas selection — the
// panel-side half of "the selected thing on the page is the highlighted thing in the panel".
describe("PropsPanel active highlight", () => {
  const renderWith = (focus: { path: string; nonce: number }) => {
    const el = buttonElement(`<Button label="Go" variant="primary" />\n`);
    render(
      <PropsPanel
        element={el}
        component="Button"
        controls={controls}
        focus={focus}
        onChange={vi.fn()}
      />,
      container,
    );
  };

  test("marks the focused leaf's field active and tags it with its path", () => {
    renderWith({ path: "label", nonce: 1 });
    const wrap = field(container, "label").closest(".nc-field");
    expect(wrap?.classList.contains("is-active")).toBe(true);
    expect(wrap?.getAttribute("data-nocms-control")).toBe("label");
  });

  test("only the targeted field is active", () => {
    renderWith({ path: "label", nonce: 1 });
    expect(container.querySelectorAll(".nc-field.is-active").length).toBe(1);
  });

  test("selecting a nested object highlights its group", () => {
    renderWith({ path: "meta", nonce: 1 });
    const group = container.querySelector(".nc-group");
    expect(group?.classList.contains("is-active")).toBe(true);
    expect(group?.getAttribute("data-nocms-control")).toBe("meta");
  });

  test("a leaf inside a group still highlights its enclosing group", () => {
    renderWith({ path: "meta.id", nonce: 1 });
    expect(container.querySelector(".nc-group")?.classList.contains("is-active")).toBe(
      true,
    );
  });

  test("selecting an array item highlights and tags its row", async () => {
    const listControls = deriveControls(
      v.object({ items: v.optional(v.array(v.object({ title: v.string() }))) }),
    );
    const el = buttonElement(`<Cards items={[{"title":"A"},{"title":"B"}]} />\n`);
    render(
      <PropsPanel
        element={el}
        component="Cards"
        controls={listControls}
        focus={{ path: "items.1", nonce: 1 }}
        onChange={vi.fn()}
      />,
      container,
    );
    await vi.waitFor(() => {
      const row = container.querySelector('[data-nocms-control="items.1"]');
      expect(row?.classList.contains("nc-list-item")).toBe(true);
      expect(row?.classList.contains("is-active")).toBe(true);
    });
  });
});

// Reverse sync: focusing a control here reports its path, so the shell can light up the matching
// leaf on the page without the canvas ever scrolling.
describe("PropsPanel onActivate", () => {
  test("reports the focused control's path", () => {
    const onActivate = vi.fn<(path: string | undefined) => void>();
    const el = buttonElement(`<Button label="Go" variant="primary" />\n`);
    render(
      <PropsPanel
        element={el}
        component="Button"
        controls={controls}
        onChange={vi.fn()}
        onActivate={onActivate}
      />,
      container,
    );
    field(container, "label").dispatchEvent(
      new FocusEvent("focusin", { bubbles: true }),
    );
    expect(onActivate).toHaveBeenCalledWith("label");
  });
});
