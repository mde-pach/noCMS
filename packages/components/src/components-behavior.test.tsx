// @vitest-environment happy-dom

// Behaviour spec for the curated library: it renders every real component with representative props
// and asserts the contracts the editor *depends on*, not whatever the code happens to do. The most
// load-bearing is class-forwarding — the Style panel writes a `class` onto the selected node, so a
// component that doesn't forward it to its painted root silently can't be styled. A red here is a
// component bug, not a test to "fix" green.

import type { ControlDescriptor } from "@nocms/controls";
import { SITE_RUNTIME_ID } from "@nocms/core";
import { h, render } from "preact";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { registry } from "./index.js";
import { type BlockDef, controlsOf } from "./packs.js";

const blocks = Object.entries(registry) as [string, BlockDef][];

function block(name: string): BlockDef {
  const def = registry[name];
  if (!def) throw new Error(`no block ${name}`);
  return def;
}

// Islands that render nothing until their ② artifact loads (feed / i18n manifest) — by design, not a
// bug. They can't be exercised synchronously, so they're verified in their own data-fed block below
// rather than skipped.
const DATA_GATED = new Set(["LatestPosts", "LanguageSwitcher"]);

function valueFor(c: ControlDescriptor): unknown {
  const cfg = (c.config ?? {}) as { options?: string[]; min?: number };
  switch (c.kind) {
    case "text":
    case "textarea":
    case "richtext":
      return `Zephyr ${c.key}`;
    case "url":
      return "https://example.test/x";
    case "reference":
      return "posts/x";
    case "date":
      return "2026-01-01";
    case "number":
    case "range":
      return (c.default as number | undefined) ?? cfg.min ?? 1;
    case "boolean":
      return (c.default as boolean | undefined) ?? true;
    case "select":
      return (c.default as string | undefined) ?? cfg.options?.[0] ?? "";
    case "color":
      return "#abcdef";
    case "image":
      return "/probe.png";
    case "group":
      return propsFrom(c.children ?? []);
    case "list":
      return [propsFrom(c.children ?? [])];
    default:
      return (c.default as unknown) ?? `${c.key}-x`;
  }
}

/** Representative props that satisfy every control (required and optional) so the component renders
 *  the way the editor would drive it. */
function propsFrom(controls: ControlDescriptor[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of controls) out[c.key] = valueFor(c);
  return out;
}

const PROBE = "nocms-probe-class";
let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  document.body.innerHTML = "";
  document.head.querySelector(`#${SITE_RUNTIME_ID}`)?.remove();
  vi.unstubAllGlobals();
});

describe("every component forwards `class` to its painted root", () => {
  for (const [name, def] of blocks) {
    if (DATA_GATED.has(name)) continue;
    test(name, () => {
      const props = { ...propsFrom(controlsOf(def)), class: PROBE };
      expect(() => render(h(def.component, props), container)).not.toThrow();
      const root = container.firstElementChild as HTMLElement | null;
      expect(root, `${name} should render a root element`).not.toBeNull();
      expect(
        root?.classList.contains(PROBE),
        `${name} must forward class to its root (Style panel depends on it)`,
      ).toBe(true);
    });
  }
});

describe("every content (text/textarea/richtext) prop reaches the output", () => {
  for (const [name, def] of blocks) {
    if (DATA_GATED.has(name)) continue;
    const controls = controlsOf(def);
    const textControl = controls.find(
      (c) =>
        !c.advanced &&
        (c.kind === "text" || c.kind === "textarea" || c.kind === "richtext"),
    );
    if (!textControl) continue;
    test(`${name}.${textControl.key}`, () => {
      const sentinel = `Sentinel${name}`;
      const props = { ...propsFrom(controls), [textControl.key]: sentinel };
      render(h(def.component, props), container);
      // The value must appear in the rendered output — as visible text or an attribute (alt, name…).
      expect(
        container.innerHTML,
        `${name}.${textControl.key} should reach the rendered output`,
      ).toContain(sentinel);
    });
  }
});

describe("every select option renders without crashing", () => {
  for (const [name, def] of blocks) {
    const controls = controlsOf(def);
    const selects = controls.filter(
      (c) =>
        c.kind === "select" &&
        Array.isArray((c.config as { options?: string[] })?.options),
    );
    if (selects.length === 0) continue;
    test(name, () => {
      for (const sel of selects) {
        const options = (sel.config as { options: string[] }).options;
        for (const opt of options) {
          const props = { ...propsFrom(controls), [sel.key]: opt };
          expect(
            () => render(h(def.component, props), container),
            `${name}.${sel.key}=${opt} should render`,
          ).not.toThrow();
        }
      }
    });
  }
});

describe("every select prop actually changes the output", () => {
  for (const [name, def] of blocks) {
    if (DATA_GATED.has(name)) continue;
    const controls = controlsOf(def);
    const selects = controls.filter(
      (c) =>
        c.kind === "select" &&
        ((c.config as { options?: string[] })?.options?.length ?? 0) >= 2,
    );
    if (selects.length === 0) continue;
    test(name, () => {
      for (const sel of selects) {
        const options = (sel.config as { options: string[] }).options;
        const outputs = new Set<string>();
        for (const opt of options) {
          render(
            h(def.component, { ...propsFrom(controls), [sel.key]: opt }),
            container,
          );
          outputs.add(container.innerHTML);
          render(null, container);
        }
        // A control that's shown but produces identical output for every option is a dead control.
        expect(
          outputs.size,
          `${name}.${sel.key} has no visible effect across ${options.join("/")}`,
        ).toBeGreaterThan(1);
      }
    });
  }
});

describe("every boolean prop actually changes the output", () => {
  for (const [name, def] of blocks) {
    if (DATA_GATED.has(name)) continue;
    const controls = controlsOf(def);
    const booleans = controls.filter((c) => c.kind === "boolean");
    if (booleans.length === 0) continue;
    test(name, () => {
      for (const b of booleans) {
        render(h(def.component, { ...propsFrom(controls), [b.key]: true }), container);
        const on = container.innerHTML;
        render(null, container);
        render(h(def.component, { ...propsFrom(controls), [b.key]: false }), container);
        const off = container.innerHTML;
        render(null, container);
        expect(on, `${name}.${b.key} has no visible effect (on vs off)`).not.toBe(off);
      }
    });
  }
});

describe("data-gated islands render and forward class once their artifact loads", () => {
  function injectRuntime(runtime: Record<string, unknown>): void {
    const script = document.createElement("script");
    script.id = SITE_RUNTIME_ID;
    script.textContent = JSON.stringify(runtime);
    document.head.appendChild(script);
  }

  test("LatestPosts", async () => {
    injectRuntime({ feedUrl: "/feed.json" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ items: [{ url: "/p/a", title: "PostProbe" }] }),
      })),
    );
    render(
      h(block("LatestPosts").component, { title: "Latest", class: PROBE }),
      container,
    );
    await vi.waitFor(() => {
      expect(container.firstElementChild).not.toBeNull();
    });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains(PROBE), "LatestPosts forwards class").toBe(true);
    expect(container.innerHTML).toContain("PostProbe");
  });

  test("LanguageSwitcher", async () => {
    const here = location.pathname || "/";
    injectRuntime({ translationsUrl: "/i18n.json", base: "/" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        // Two locales for the current route → ≥2 links → the switcher renders.
        json: async () => ({
          locales: ["en", "fr"],
          groups: [{ translations: { en: here, fr: "/fr-probe" } }],
        }),
      })),
    );
    render(h(block("LanguageSwitcher").component, { class: PROBE }), container);
    await vi.waitFor(() => {
      expect(container.firstElementChild).not.toBeNull();
    });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains(PROBE), "LanguageSwitcher forwards class").toBe(
      true,
    );
  });
});
