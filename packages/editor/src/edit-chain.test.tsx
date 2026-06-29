// @vitest-environment happy-dom

// The full editing chain, end to end, for every component: drive a control through the *real*
// PropsPanel → serialize the doc to MDX → render it through the publish renderer → assert the value
// reached the output. This is the seam the widget-only and component-only matrices each miss: it
// catches a control whose key doesn't match the component's prop, or a value the serializer drops —
// the edit would look fine in the panel yet never reach the page.

import { type BlockDef, controlsOf, registry } from "@nocms/components";
import type { ControlDescriptor } from "@nocms/controls";
import { renderToHtml } from "@nocms/renderer";
import { render } from "preact";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  isJsxElement,
  type JsxElement,
  setProp,
  setStructuredProp,
} from "./jsx-attributes.js";
import { parseMdx, serializeMdx } from "./mdx-document.js";
import { PropsPanel } from "./props-panel.js";

const blocks = Object.entries(registry) as [string, BlockDef][];
const componentMap = Object.fromEntries(blocks.map(([n, d]) => [n, d.component]));

// Islands render nothing in the static publish render — their content arrives from a ② artifact via
// client fetch + hydration, not from props at render time. The chain through *props* is covered by
// the non-island components; islands are exercised live in e2e/.
const DATA_GATED = new Set(["LatestPosts", "LanguageSwitcher"]);

function valueFor(c: ControlDescriptor): unknown {
  const cfg = (c.config ?? {}) as { options?: string[]; min?: number };
  // Any control with a fixed option set (select, layout-direction, layout-align) must seed a *valid*
  // option — a garbage value would silently change a sibling control's `showIf` (e.g. Frame.wrap only
  // shows when direction is "row") and skew the test.
  if (Array.isArray(cfg.options) && cfg.options.length > 0) {
    return (c.default as string | undefined) ?? cfg.options[0];
  }
  switch (c.kind) {
    case "number":
    case "range":
      return (c.default as number | undefined) ?? cfg.min ?? 1;
    case "boolean":
      return (c.default as boolean | undefined) ?? true;
    case "color":
      return "#abcdef";
    case "image":
      return "/probe.png";
    case "url":
      return "https://example.test/x";
    case "date":
      return "2026-01-01";
    case "group":
      return seedObject(c.children ?? []);
    case "list":
      return [seedObject(c.children ?? [])];
    default:
      return `Zephyr ${c.key}`;
  }
}

const seedObject = (controls: ControlDescriptor[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const c of controls) out[c.key] = valueFor(c);
  return out;
};

/** Seed every control with a representative value so the component renders fully, leaving `skip`
 *  for the panel to drive. Mirrors the editor's own write seam (setProp / setStructuredProp). */
function seed(node: JsxElement, controls: ControlDescriptor[], skip: string): void {
  for (const c of controls) {
    if (c.key === skip || c.kind === "hidden") continue;
    if (c.kind === "group" || c.kind === "list") {
      setStructuredProp(node, c.key, valueFor(c));
    } else {
      setProp(node, c.key, valueFor(c) as string);
    }
  }
}

/** A control gated behind a `showIf` is only editable once its condition holds (e.g. Frame.wrap
 *  needs direction="row"). Satisfy it so the panel actually surfaces the control under test. */
function satisfyShowIf(node: JsxElement, control: ControlDescriptor): void {
  const gate = control.showIf as { key: string; equals: unknown } | undefined;
  if (gate) setProp(node, gate.key, gate.equals as string);
}

function fixture(name: string): { node: JsxElement; doc: ReturnType<typeof parseMdx> } {
  const doc = parseMdx(`<${name} />\n`);
  const node = doc.children[0];
  if (!node || !isJsxElement(node)) throw new Error(`bad fixture for ${name}`);
  return { node, doc };
}

function input(el: HTMLElement, value: string): void {
  (el as HTMLInputElement).value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

/** Drive a select to `value` through whichever widget it rendered (a native dropdown for >3 options,
 *  a segmented control otherwise). */
function driveSelect(key: string, value: string): void {
  const dropdown = container.querySelector(
    `select[name="${key}"]`,
  ) as HTMLSelectElement | null;
  if (dropdown) {
    dropdown.value = value;
    dropdown.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  const seg = container.querySelector(
    `[name="${key}"][value="${value}"]`,
  ) as HTMLElement | null;
  if (seg) click(seg);
}

function mountPanel(
  name: string,
  node: JsxElement,
  controls: ControlDescriptor[],
): void {
  render(
    <PropsPanel
      element={node}
      component={name}
      controls={controls}
      onChange={() => {}}
    />,
    container,
  );
}

let container: HTMLElement;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(() => {
  render(null, container);
  document.body.innerHTML = "";
});

const renderMdx = (mdx: string): Promise<string> =>
  renderToHtml({ mdx, components: componentMap });

describe("editing a content prop in the panel reaches the rendered page", () => {
  for (const [name, def] of blocks) {
    if (DATA_GATED.has(name)) continue;
    const controls = controlsOf(def);
    const text = controls.find(
      (c) =>
        !c.advanced &&
        (c.kind === "text" || c.kind === "textarea" || c.kind === "richtext"),
    );
    if (!text) continue;
    test(`${name}.${text.key}`, async () => {
      const { node, doc } = fixture(name);
      seed(node, controls, text.key);
      satisfyShowIf(node, text);
      mountPanel(name, node, controls);
      const sentinel = `Chain${name}`;
      input(container.querySelector(`[name="${text.key}"]`) as HTMLElement, sentinel);

      const html = await renderMdx(serializeMdx(doc));
      expect(html, `${name}.${text.key} edited in the panel should render`).toContain(
        sentinel,
      );
    });
  }
});

describe("changing a select in the panel changes the rendered page", () => {
  for (const [name, def] of blocks) {
    if (DATA_GATED.has(name)) continue;
    const controls = controlsOf(def);
    const sel = controls.find(
      (c) =>
        !c.advanced &&
        c.kind === "select" &&
        ((c.config as { options?: string[] })?.options?.length ?? 0) >= 2,
    );
    if (!sel) continue;
    const options = (sel.config as { options: string[] }).options;
    test(`${name}.${sel.key}`, async () => {
      const { node, doc } = fixture(name);
      seed(node, controls, sel.key);
      satisfyShowIf(node, sel);
      mountPanel(name, node, controls);

      driveSelect(sel.key, options[0] as string);
      const a = await renderMdx(serializeMdx(doc));
      driveSelect(sel.key, options[options.length - 1] as string);
      const b = await renderMdx(serializeMdx(doc));

      expect(
        a,
        `${name}.${sel.key} should change the page across its options`,
      ).not.toBe(b);
    });
  }
});

describe("toggling a boolean in the panel changes the rendered page", () => {
  for (const [name, def] of blocks) {
    if (DATA_GATED.has(name)) continue;
    const controls = controlsOf(def);
    const bool = controls.find((c) => !c.advanced && c.kind === "boolean");
    if (!bool) continue;
    test(`${name}.${bool.key}`, async () => {
      const { node, doc } = fixture(name);
      seed(node, controls, bool.key);
      satisfyShowIf(node, bool);
      mountPanel(name, node, controls);

      // Two toggles give both *explicit* states (true then false) through the chain — comparing
      // against the unseeded baseline would instead measure default-vs-explicit and miss the effect.
      const toggle = () =>
        click(container.querySelector(`[name="${bool.key}"]`) as HTMLElement);
      toggle();
      const on = await renderMdx(serializeMdx(doc));
      toggle();
      const off = await renderMdx(serializeMdx(doc));

      expect(on, `${name}.${bool.key} should change the page when toggled`).not.toBe(
        off,
      );
    });
  }
});
