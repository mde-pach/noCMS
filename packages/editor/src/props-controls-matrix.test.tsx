// @vitest-environment happy-dom

// An exhaustive widget/write matrix for the props panel: for every ControlDescriptor `kind`
// the panel renders, assert (a) the correct widget appears and (b) a simulated user edit writes
// the correct serialized prop value back onto the in-place-mutated JSX node. Plus a per-component
// pass over the curated registry so a control that silently stops rendering (or stops writing)
// turns a test red regardless of which component surfaces it.

import { type BlockDef, controlsOf, registry } from "@nocms/components";
import { type ControlDescriptor, deriveControls } from "@nocms/controls";
import { render } from "preact";
import * as v from "valibot";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  getProp,
  getStructuredProp,
  isJsxElement,
  type JsxElement,
} from "./jsx-attributes.js";
import { parseMdx } from "./mdx-document.js";
import { PropsPanel } from "./props-panel.js";

function jsxElement(mdx: string): JsxElement {
  const node = parseMdx(mdx).children[0];
  if (!node || !isJsxElement(node)) throw new Error("expected a JSX element");
  return node;
}

function field(root: Element, name: string): HTMLInputElement & HTMLSelectElement {
  const el = root.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`no field ${name}`);
  return el as HTMLInputElement & HTMLSelectElement;
}

function segOption(root: Element, name: string, value: string): HTMLButtonElement {
  const el = root.querySelector(`[name="${name}"][value="${value}"]`);
  if (!el) throw new Error(`no option ${name}=${value}`);
  return el as HTMLButtonElement;
}

function input(el: HTMLElement, value: string): void {
  (el as HTMLInputElement).value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function change(el: HTMLElement, value: string): void {
  (el as HTMLSelectElement).value = value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

let container: HTMLElement;

function mount(
  element: JsxElement,
  controls: ControlDescriptor[],
  extra: { onPickImage?: (key: string) => void } = {},
): void {
  render(
    <PropsPanel
      element={element}
      component="Fixture"
      controls={controls}
      onChange={vi.fn()}
      onPickImage={extra.onPickImage}
    />,
    container,
  );
}

const controlsFor = (schema: v.GenericSchema): ControlDescriptor[] =>
  deriveControls(schema);

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.innerHTML = "";
});

describe("props control matrix — one test per kind", () => {
  test("text: edits write a string; clearing removes the prop", () => {
    const el = jsxElement(`<Fixture title="Hi" />\n`);
    mount(el, controlsFor(v.object({ title: v.string() })));
    const f = field(container, "title");
    expect(f.type).toBe("text");
    input(f, "Hello");
    expect(getProp(el, "title")).toBe("Hello");
    input(f, "");
    expect(getProp(el, "title")).toBeUndefined();
  });

  test("textarea: writes a string; empty clears", () => {
    const el = jsxElement(`<Fixture body="x" />\n`);
    mount(
      el,
      controlsFor(
        v.object({ body: v.pipe(v.string(), v.metadata({ control: "textarea" })) }),
      ),
    );
    const f = container.querySelector('textarea[name="body"]') as HTMLTextAreaElement;
    expect(f).not.toBeNull();
    input(f, "long copy");
    expect(getProp(el, "body")).toBe("long copy");
    input(f, "");
    expect(getProp(el, "body")).toBeUndefined();
  });

  test("number: writes a Number; empty clears", () => {
    const el = jsxElement(`<Fixture count={1} />\n`);
    mount(el, controlsFor(v.object({ count: v.number() })));
    const f = field(container, "count");
    expect(f.type).toBe("number");
    input(f, "42");
    expect(getProp(el, "count")).toBe(42);
    input(f, "");
    expect(getProp(el, "count")).toBeUndefined();
  });

  test("range: renders an input[type=range] and writes a Number", () => {
    const el = jsxElement(`<Fixture size={2} />\n`);
    mount(
      el,
      controlsFor(v.object({ size: v.pipe(v.number(), v.minValue(1), v.maxValue(6)) })),
    );
    const f = field(container, "size");
    expect(f.type).toBe("range");
    input(f, "5");
    expect(getProp(el, "size")).toBe(5);
  });

  test("boolean: nc-toggle flips the value and aria-pressed reflects it", () => {
    const el = jsxElement(`<Fixture dark={true} />\n`);
    mount(el, controlsFor(v.object({ dark: v.boolean() })));
    const toggle = field(container, "dark");
    expect(toggle.classList.contains("nc-toggle")).toBe(true);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    click(toggle);
    expect(getProp(el, "dark")).toBe(false);
  });

  test("select ≤3 options: renders a segmented control, writes the choice, pressed reflects current", () => {
    const el = jsxElement(`<Fixture variant="primary" />\n`);
    mount(el, controlsFor(v.object({ variant: v.picklist(["primary", "secondary"]) })));
    expect(
      segOption(container, "variant", "primary").getAttribute("aria-pressed"),
    ).toBe("true");
    click(segOption(container, "variant", "secondary"));
    expect(getProp(el, "variant")).toBe("secondary");
  });

  test("select >3 options: renders a <select> and change writes", () => {
    const el = jsxElement(`<Fixture size="md" />\n`);
    mount(el, controlsFor(v.object({ size: v.picklist(["xs", "sm", "md", "lg"]) })));
    const f = field(container, "size");
    expect(f.tagName).toBe("SELECT");
    change(f, "lg");
    expect(getProp(el, "size")).toBe("lg");
  });

  test("color: both the swatch input[type=color] and the text input commit", () => {
    const schema = v.object({
      tint: v.pipe(v.string(), v.metadata({ control: "color" })),
    });
    {
      const el = jsxElement(`<Fixture tint="#111111" />\n`);
      mount(el, controlsFor(schema));
      const swatch = container.querySelector('input[type="color"]') as HTMLInputElement;
      expect(swatch).not.toBeNull();
      input(swatch, "#abcdef");
      expect(getProp(el, "tint")).toBe("#abcdef");
      render(null, container);
    }
    {
      const el = jsxElement(`<Fixture tint="#111111" />\n`);
      mount(el, controlsFor(schema));
      const text = field(container, "tint");
      expect(text.type).toBe("text");
      input(text, "#00ff00");
      expect(getProp(el, "tint")).toBe("#00ff00");
    }
  });

  test("image (top-level, with onPickImage): Replace fires onPickImage(key)", () => {
    const el = jsxElement(`<Fixture src="/a.png" />\n`);
    const onPickImage = vi.fn<(key: string) => void>();
    mount(
      el,
      controlsFor(
        v.object({ src: v.pipe(v.string(), v.metadata({ control: "image" })) }),
      ),
      { onPickImage },
    );
    const replace = field(container, "src");
    expect(replace.tagName).toBe("BUTTON");
    expect(replace.textContent).toContain("Replace");
    click(replace);
    expect(onPickImage).toHaveBeenCalledWith("src");
  });

  // Intent: a nested image is still editable and writes its src into the parent object. The media
  // picker is a top-level affordance (it needs `onPickImage`), so nested falls to a text field — v1
  // implementation, not the contract.
  test("image (nested in a group): renders an editable control that writes the src", () => {
    const el = jsxElement(`<Fixture media={{"src":"/a.png"}} />\n`);
    mount(
      el,
      controlsFor(
        v.object({
          media: v.object({
            src: v.pipe(v.string(), v.metadata({ control: "image" })),
          }),
        }),
      ),
    );
    input(field(container, "src"), "/b.png");
    expect(getStructuredProp(el, "media")).toEqual({ src: "/b.png" });
  });

  test("url: renders input[type=url] and writes", () => {
    const el = jsxElement(`<Fixture href="/x" />\n`);
    mount(
      el,
      controlsFor(
        v.object({ href: v.pipe(v.string(), v.metadata({ control: "url" })) }),
      ),
    );
    const f = field(container, "href");
    expect(f.type).toBe("url");
    input(f, "https://example.com");
    expect(getProp(el, "href")).toBe("https://example.com");
  });

  test("date: renders input[type=date] and writes", () => {
    const el = jsxElement(`<Fixture day="2026-01-01" />\n`);
    mount(
      el,
      controlsFor(
        v.object({ day: v.pipe(v.string(), v.metadata({ control: "date" })) }),
      ),
    );
    const f = field(container, "day");
    expect(f.type).toBe("date");
    input(f, "2026-06-29");
    expect(getProp(el, "day")).toBe("2026-06-29");
  });

  test("richtext: renders a textarea and writes", () => {
    const el = jsxElement(`<Fixture prose="x" />\n`);
    mount(
      el,
      controlsFor(
        v.object({ prose: v.pipe(v.string(), v.metadata({ control: "richtext" })) }),
      ),
    );
    const f = container.querySelector('textarea[name="prose"]') as HTMLTextAreaElement;
    expect(f).not.toBeNull();
    input(f, "**bold**");
    expect(getProp(el, "prose")).toBe("**bold**");
  });

  // Intent: a reference control is an editable field that writes the chosen reference. v1 has no
  // reference *picker* yet, so it's a text field — that's an implementation detail, not the contract.
  test("reference: renders an editable control that writes the value", () => {
    const el = jsxElement(`<Fixture rel="" />\n`);
    mount(
      el,
      controlsFor(
        v.object({ rel: v.pipe(v.string(), v.metadata({ control: "reference" })) }),
      ),
    );
    input(field(container, "rel"), "posts/hello");
    expect(getProp(el, "rel")).toBe("posts/hello");
  });

  test("group: editing a child merges into the object, preserving siblings", () => {
    const el = jsxElement(`<Fixture meta={{"id":"a","title":"T"}} />\n`);
    mount(
      el,
      controlsFor(v.object({ meta: v.object({ id: v.string(), title: v.string() }) })),
    );
    input(field(container, "id"), "b");
    expect(getStructuredProp(el, "meta")).toEqual({ id: "b", title: "T" });
  });

  test("list: Add grows the array and editing an item field writes it back", async () => {
    const el = jsxElement(`<Fixture items={[{"title":"A"}]} />\n`);
    mount(
      el,
      controlsFor(v.object({ items: v.array(v.object({ title: v.string() })) })),
    );
    click(container.querySelector(".nc-list-add") as HTMLElement);
    expect(getStructuredProp(el, "items")).toEqual([{ title: "A" }, { title: "" }]);
    // The structured-prop write re-renders the panel asynchronously; the new item then renders
    // expanded so its title field is reachable.
    await vi.waitFor(() => {
      expect(container.querySelectorAll(".nc-list-item").length).toBe(2);
    });
    input(field(container, "title"), "B");
    expect(getStructuredProp(el, "items")).toEqual([{ title: "A" }, { title: "B" }]);
  });

  test("layout-direction: segmented control writes the direction prop", () => {
    const el = jsxElement(`<Fixture direction="column" />\n`);
    mount(
      el,
      controlsFor(
        v.object({
          direction: v.pipe(
            v.picklist(["row", "column", "grid"]),
            v.metadata({ control: "layout-direction" }),
          ),
        }),
      ),
    );
    expect(
      segOption(container, "direction", "column").getAttribute("aria-pressed"),
    ).toBe("true");
    click(segOption(container, "direction", "row"));
    expect(getProp(el, "direction")).toBe("row");
  });

  test("layout-align: a matrix cell co-writes both align and justify (config.mainKey)", () => {
    const el = jsxElement(`<Frame direction="row" align="start" justify="start" />\n`);
    mount(el, controlsFor(FrameAlignSchema));
    const matrix = container.querySelector(".nc-align-matrix") as HTMLElement;
    expect(matrix).not.toBeNull();
    // direction="row" → horizontal axis is main: col index is the main (justify), row is cross (align).
    // The cell at (row "end", col "center") → align=end, justify=center.
    const cell = matrix.querySelector('[aria-label="end center"]') as HTMLButtonElement;
    expect(cell).not.toBeNull();
    click(cell);
    expect(getProp(el, "align")).toBe("end");
    expect(getProp(el, "justify")).toBe("center");
  });
});

const FrameAlignSchema = v.object({
  direction: v.pipe(
    v.picklist(["row", "column", "grid"]),
    v.metadata({ control: "layout-direction" }),
  ),
  align: v.pipe(
    v.picklist(["start", "center", "end"]),
    v.metadata({ control: "layout-align", config: { mainKey: "justify" } }),
  ),
  justify: v.pipe(
    v.picklist(["start", "center", "end"]),
    v.metadata({ control: "hidden" }),
  ),
});

const isWritableText = (c: ControlDescriptor): boolean =>
  c.kind === "text" ||
  c.kind === "textarea" ||
  c.kind === "richtext" ||
  c.kind === "url" ||
  c.kind === "date" ||
  c.kind === "reference";

const writeValue = (c: ControlDescriptor): string =>
  c.kind === "date"
    ? "2026-06-29"
    : c.kind === "url"
      ? `https://x.test/${c.key}`
      : `${c.key}-edited`;

describe("every core component's controls are reachable and write", () => {
  for (const [name, def] of Object.entries(registry) as [string, BlockDef][]) {
    test(`${name}: every visible control renders a reachable widget; text-like ones write`, () => {
      const controls = controlsOf(def);
      const el = jsxElement(`<${name}/>\n`);
      expect(() => mount(el, controls)).not.toThrow();
      expect(container.querySelector(".nocms-props")).not.toBeNull();

      // Visible top-level scalars: groups/lists own their own markup; hidden render nothing; showIf
      // controls only appear when their gate matches; advanced fold under "More".
      const visible = controls.filter(
        (c) =>
          c.kind !== "hidden" &&
          c.kind !== "group" &&
          c.kind !== "list" &&
          !c.advanced &&
          !c.showIf,
      );

      // Every such control must surface a reachable widget. Most are keyed by prop name; the
      // align matrix is a 2-axis grid that co-writes align+justify, so it has no single `name`.
      for (const c of visible) {
        const widget =
          c.kind === "layout-align"
            ? container.querySelector(".nc-align-matrix")
            : container.querySelector(`[name="${c.key}"]`);
        expect(
          widget,
          `${name}.${c.key} (${c.kind}) should render a reachable widget`,
        ).not.toBeNull();
      }

      // Every text-like control on the component must write its value to the right key.
      for (const c of visible.filter(isWritableText)) {
        const f = container.querySelector(`[name="${c.key}"]`) as HTMLElement;
        const val = writeValue(c);
        input(f, val);
        expect(getProp(el, c.key), `${name}.${c.key} should write`).toBe(val);
      }
    });
  }
});
