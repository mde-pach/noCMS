// @vitest-environment happy-dom

import { type ComponentRegistry, defineSavedComponent } from "@nocms/components";
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

    // The brand color is picked from the Design & brand swatch palette; expand it first.
    (target.querySelector(".nc-brand-entry") as HTMLElement).click();
    const slate = target.querySelector(
      '.nc-swatch[name="color.brand.500"][value="#3D5A98"]',
    ) as HTMLElement;
    slate.click();

    const themed = [...target.querySelectorAll("style")].map(
      (s) => s.textContent ?? "",
    );
    expect(themed.some((c) => c.includes("--color-brand-500: #3D5A98;"))).toBe(true);
    expect(onTokensChange).toHaveBeenCalledWith(
      expect.stringContaining("color.brand.500: #3D5A98"),
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
    expect(target.querySelector(".nocms-props-title")?.textContent).toBe("Button");

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

  test("the catalog sheet adds the chosen block to the document", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onChange = vi.fn();
    const handle = await mountEditor({
      target,
      mdx: `<Button label="A" />\n`,
      components,
      onChange,
    });

    // "Add a section" opens the catalog modal, which lists every registry block.
    const addSection = [
      ...target.querySelectorAll(".nocms-editor-panel .nc-btn-primary"),
    ].find((b) => b.textContent?.includes("Add a section"));
    if (!addSection) throw new Error("no Add a section button");
    (addSection as HTMLElement).click();

    const image = [...target.querySelectorAll(".nocms-catalog-card")].find((b) =>
      b.textContent?.includes("Image"),
    );
    if (!image) throw new Error("no Image catalog card");
    (image as HTMLElement).click();

    await vi.waitFor(() =>
      expect(target.querySelector(".nocms-editor-canvas .img")).not.toBeNull(),
    );
    expect(onChange).toHaveBeenCalled();
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

// A Button with more than one control, so locking vs exposing is observable.
const CtaButton: ComponentType<Record<string, unknown>> = (props) =>
  h(
    "a",
    { class: `btn btn-${(props.variant as string) ?? "primary"}` },
    props.label as string,
  );

const savedComponents: ComponentRegistry = {
  Button: {
    component: asComponent(CtaButton),
    schema: v.object({
      label: v.string(),
      variant: v.optional(v.picklist(["primary", "secondary"]), "primary"),
    }),
  },
};

// A container whose children render in a slot — for composing a layout wrapper.
const Box: ComponentType<Record<string, unknown>> = (props) =>
  h(
    "section",
    { class: `box box-${(props.tone as string) ?? "plain"}` },
    props.children as never,
  );

const composeComponents: ComponentRegistry = {
  Box: {
    component: asComponent(Box),
    schema: v.object({ tone: v.optional(v.picklist(["plain", "muted"]), "plain") }),
    slots: ["children"],
  },
  Button: {
    component: asComponent(CtaButton),
    schema: v.object({ label: v.string() }),
  },
};

function openSaveDialog(target: Element): void {
  selectFirst(target, ".btn");
  const save = target.querySelector(".nocms-tool-save-component");
  if (!save) throw new Error("no Save-as-component action on the toolbar");
  (save as HTMLElement).click();
}

async function nameAndConfirm(target: Element, name: string): Promise<void> {
  const input = target.querySelector(
    '.nocms-save-dialog [name="component-name"]',
  ) as HTMLInputElement;
  input.value = name;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  const confirm = target.querySelector(".nocms-save-confirm") as HTMLButtonElement;
  // The confirm button enables once the name validates (preact state flushes async).
  await vi.waitFor(() => expect(confirm.disabled).toBe(false));
  confirm.click();
}

describe("save as component (D20)", () => {
  test("promotes the selection to a saved component, baking the locked control", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onChange = vi.fn();
    const handle = await mountEditor({
      target,
      mdx: `<Button label="Get started" variant="secondary" />\n`,
      components: savedComponents,
      onChange,
    });

    openSaveDialog(target);
    expect(target.querySelector(".nocms-save-dialog")).not.toBeNull();

    // Opt-out demotion: every control starts editable. Lock `variant`.
    const variant = target.querySelector(
      '.nocms-expose-toggle[data-key="variant"]',
    ) as HTMLElement;
    expect(variant.getAttribute("aria-pressed")).toBe("true");
    variant.click();
    await vi.waitFor(() => expect(variant.getAttribute("aria-pressed")).toBe("false"));

    await nameAndConfirm(target, "PrimaryCTA");

    // The selection is now a PrimaryCTA instance; the locked variant is baked in (not inline).
    await vi.waitFor(() =>
      expect(onChange.mock.calls.at(-1)?.[0]).toContain("<PrimaryCTA"),
    );
    const mdx = onChange.mock.calls.at(-1)?.[0] as string;
    expect(mdx).toContain('label="Get started"');
    expect(mdx).not.toContain("variant=");
    // It still renders, baking the locked variant=secondary.
    expect(target.querySelector(".nocms-editor-canvas .btn-secondary")).not.toBeNull();

    // The props panel for the instance shows only the exposed control.
    expect(target.querySelector(".nocms-props-title")?.textContent).toBe("PrimaryCTA");
    expect(panelField(target, "label").value).toBe("Get started");
    expect(target.querySelector('.nocms-editor-panel [name="variant"]')).toBeNull();

    handle.dispose();
  });

  test("the saved component joins the catalog and inserts as a reusable instance", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onChange = vi.fn();
    const handle = await mountEditor({
      target,
      mdx: `<Button label="Get started" variant="secondary" />\n`,
      components: savedComponents,
      onChange,
    });

    openSaveDialog(target);
    await nameAndConfirm(target, "PrimaryCTA");
    await vi.waitFor(() =>
      expect(onChange.mock.calls.at(-1)?.[0]).toContain("<PrimaryCTA"),
    );

    // Deselect so the rail offers "Add a section", then open the catalog.
    target
      .querySelector(".nocms-editor-canvas")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const add = [
      ...target.querySelectorAll(".nocms-editor-panel .nc-btn-primary"),
    ].find((b) => b.textContent?.includes("Add a section"));
    (add as HTMLElement).click();

    // The catalog lists the saved component alongside the curated set.
    const card = [...target.querySelectorAll(".nocms-catalog-card")].find((b) =>
      b.textContent?.includes("PrimaryCTA"),
    );
    if (!card) throw new Error("PrimaryCTA not in the catalog");
    (card as HTMLElement).click();

    // Inserting it renders a second instance via the one renderer.
    await vi.waitFor(() =>
      expect(
        target.querySelectorAll(".nocms-editor-canvas .btn").length,
      ).toBeGreaterThan(1),
    );

    handle.dispose();
  });

  test("rehydrates a persisted definition on mount so its instance renders", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const primaryCta = defineSavedComponent({
      name: "PrimaryCTA",
      base: "Button",
      props: { label: "Get started", variant: "secondary" },
      expose: ["label"],
    });

    const handle = await mountEditor({
      target,
      mdx: `<PrimaryCTA label="Hello" />\n`,
      components: savedComponents,
      savedComponents: [primaryCta],
    });

    // The page references a saved component; loading its definition lets it render,
    // baking the locked variant=secondary.
    const el = target.querySelector(".nocms-editor-canvas .btn-secondary");
    expect(el?.textContent).toBe("Hello");

    handle.dispose();
  });

  test("emits the authored definition through onSaveComponent (the persist seam)", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onSaveComponent = vi.fn();
    const handle = await mountEditor({
      target,
      mdx: `<Button label="Go" variant="secondary" />\n`,
      components: savedComponents,
      onSaveComponent,
    });

    openSaveDialog(target);
    const variant = target.querySelector(
      '.nocms-expose-toggle[data-key="variant"]',
    ) as HTMLElement;
    variant.click();
    await vi.waitFor(() => expect(variant.getAttribute("aria-pressed")).toBe("false"));
    await nameAndConfirm(target, "PrimaryCTA");

    await vi.waitFor(() => expect(onSaveComponent).toHaveBeenCalled());
    const def = onSaveComponent.mock.calls.at(-1)?.[0];
    expect(def.name).toBe("PrimaryCTA");
    expect(def.base).toBe("Button");
    expect(def.exposed).toEqual({ label: "Go" });
    expect(def.locked).toEqual({ variant: "secondary" });

    handle.dispose();
  });

  test("composes a container into a component, keeping its contents as a slot", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onChange = vi.fn();
    const handle = await mountEditor({
      target,
      mdx: `<Box tone="muted">\n  <Button label="Inside" />\n</Box>\n`,
      components: composeComponents,
      onChange,
    });

    // Select the container Box and open the dialog.
    selectFirst(target, ".box");
    (target.querySelector(".nocms-tool-save-component") as HTMLElement).click();

    // A container offers keeping its contents as an editable slot (default on).
    const slotToggle = target.querySelector(".nocms-slot-toggle") as HTMLElement;
    expect(slotToggle).not.toBeNull();
    expect(slotToggle.getAttribute("aria-pressed")).toBe("true");

    await nameAndConfirm(target, "MutedBox");

    await vi.waitFor(() =>
      expect(onChange.mock.calls.at(-1)?.[0]).toContain("<MutedBox"),
    );
    const mdx = onChange.mock.calls.at(-1)?.[0] as string;
    // The contents stay inline as the instance's children (the editable slot).
    expect(mdx).toContain('<Button label="Inside"');
    // It renders: the Box wrapper around the kept child, through the registry.
    expect(target.querySelector(".nocms-editor-canvas .box-muted")).not.toBeNull();
    expect(
      target.querySelector(".nocms-editor-canvas .box-muted .btn")?.textContent,
    ).toBe("Inside");

    handle.dispose();
  });
});
