// @vitest-environment happy-dom

import { type ControlDescriptor, deriveControls } from "@nocms/core";
import * as v from "valibot";
import { describe, expect, test, vi } from "vitest";
import { createContentEditor } from "./content-edit.js";
import {
  getProp,
  getStructuredProp,
  isJsxElement,
  type JsxElement,
} from "./jsx-attributes.js";
import { parseMdx } from "./mdx-document.js";

function jsxNode(mdx: string): JsxElement {
  const node = parseMdx(mdx).children[0];
  if (!node || !isJsxElement(node)) throw new Error("expected a JSX element");
  return node;
}

function leafEl(text: string): HTMLElement {
  const el = document.createElement("span");
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

function type(el: HTMLElement, text: string): void {
  el.textContent = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function deps() {
  const handleEdit = vi.fn().mockResolvedValue(undefined);
  const refreshPanel = vi.fn();
  const markDirty = vi.fn();
  const config = {
    docs: { handleEdit } as unknown as Parameters<
      typeof createContentEditor
    >[0]["docs"],
    canvas: { highlight: vi.fn() } as unknown as Parameters<
      typeof createContentEditor
    >[0]["canvas"],
    onStart: vi.fn(),
    refreshPanel,
    markDirty,
  };
  return { config, handleEdit, refreshPanel, markDirty };
}

const heroControls: ControlDescriptor[] = deriveControls(
  v.object({ title: v.string() }),
);
const pricingControls: ControlDescriptor[] = deriveControls(
  v.object({
    tiers: v.optional(v.array(v.object({ name: v.string() })), [
      { name: "A" },
      { name: "B" },
    ]),
  }),
);

describe("createContentEditor", () => {
  test("typing writes a scalar prop live and refreshes the panel each keystroke", () => {
    const d = deps();
    const node = jsxNode(`<Hero title="Old" />\n`);
    const el = leafEl("Old");
    const editor = createContentEditor(d.config);

    editor.start(el, node, "title", heroControls);
    type(el, "New");

    expect(getProp(node, "title")).toBe("New"); // written live, before commit
    expect(d.refreshPanel).toHaveBeenCalled();
    expect(d.markDirty).toHaveBeenCalled();
  });

  test("commit snapshots to history once (and only when changed)", async () => {
    const d = deps();
    const editor = createContentEditor(d.config);

    const node = jsxNode(`<Hero title="Old" />\n`);
    const el = leafEl("Old");
    editor.start(el, node, "title", heroControls);
    await editor.commit(); // no edit → no history churn
    expect(d.handleEdit).not.toHaveBeenCalled();

    editor.start(el, node, "title", heroControls);
    type(el, "Changed");
    await editor.commit();
    expect(d.handleEdit).toHaveBeenCalledTimes(1);
  });

  test("cancel restores the source exactly — even a prop that wasn't present", () => {
    const d = deps();
    const node = jsxNode(`<Hero />\n`); // no title attribute
    const el = leafEl("");
    const editor = createContentEditor(d.config);

    editor.start(el, node, "title", heroControls);
    type(el, "typed then abandoned");
    expect(getProp(node, "title")).toBe("typed then abandoned");

    editor.cancel();
    expect(getProp(node, "title")).toBeUndefined(); // attribute not materialized
    expect(el.textContent).toBe("");
  });

  test("writes a nested array leaf, seeding from the schema default", () => {
    const d = deps();
    const node = jsxNode(`<Pricing />\n`); // tiers come from the default
    const el = leafEl("B");
    const editor = createContentEditor(d.config);

    editor.start(el, node, "tiers.1.name", pricingControls);
    type(el, "Pro");

    const tiers = getStructuredProp(node, "tiers") as { name: string }[];
    expect(tiers.map((t) => t.name)).toEqual(["A", "Pro"]); // only index 1 changed
  });
});
