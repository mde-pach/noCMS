import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { describe, expect, test } from "vitest";
import {
  controlsOf,
  core,
  createRegistry,
  defineSavedComponent,
  manifestOf,
  registryManifest,
  savedBlockFromDefinition,
  savedPack,
} from "./index";

const base = createRegistry(core);

const cta = defineSavedComponent({
  name: "PrimaryCTA",
  base: "Button",
  props: { label: "Get started", href: "/signup", variant: "primary" },
  expose: ["label", "href"],
  description: "Our primary call-to-action.",
});

describe("defineSavedComponent", () => {
  test("bakes the non-exposed props and seeds the exposed ones", () => {
    expect(cta.locked).toEqual({ variant: "primary" });
    expect(cta.exposed).toEqual({ label: "Get started", href: "/signup" });
    expect(cta.version).toBe(1);
  });
});

describe("savedBlockFromDefinition", () => {
  test("exposes only the exposed controls, reseeded to the saved value", () => {
    const def = savedBlockFromDefinition(cta, base);
    const controls = controlsOf(def);
    expect(controls.map((c) => c.key)).toEqual(["label", "href"]);
    expect(controls.find((c) => c.key === "label")?.default).toBe("Get started");
    expect(controls.find((c) => c.key === "href")?.default).toBe("/signup");
    // The locked `variant` is gone from the panel.
    expect(controls.some((c) => c.key === "variant")).toBe(false);
  });

  test("synthesized component bakes locked props and renders exposed ones", () => {
    const def = savedBlockFromDefinition(cta, base);
    const html = renderToString(
      h(def.component, { label: "Hello", href: "/x", variant: "secondary" }),
    );
    expect(html).toContain("Hello");
    expect(html).toContain('href="/x"');
    // The locked variant wins; a passed-in variant cannot override it.
    expect(html).toContain("btn-primary");
    expect(html).not.toContain("btn-secondary");
  });

  test("falls back to the seeded defaults when an exposed prop is absent", () => {
    const def = savedBlockFromDefinition(cta, base);
    const html = renderToString(h(def.component, {}));
    expect(html).toContain("Get started");
    expect(html).toContain('href="/signup"');
  });

  test("throws on an unknown base block", () => {
    expect(() =>
      savedBlockFromDefinition(
        { name: "X", base: "Nope", locked: {}, exposed: {} },
        base,
      ),
    ).toThrow(/unknown base block/);
  });
});

describe("savedPack", () => {
  test("composes into a registry and surfaces as a manifest like any block", () => {
    const registry = createRegistry(core, savedPack([cta], base));
    const manifest = registryManifest(registry).find((m) => m.name === "PrimaryCTA");
    expect(manifest?.controls.map((c) => c.key)).toEqual(["label", "href"]);
    expect(manifest?.defaults).toEqual({
      label: "Get started",
      href: "/signup",
    });
  });

  test("a saved component's manifest carries its display metadata", () => {
    const def = savedBlockFromDefinition(cta, base);
    const manifest = manifestOf("PrimaryCTA", def);
    expect(manifest.displayName).toBe("PrimaryCTA");
    expect(manifest.description).toBe("Our primary call-to-action.");
  });
});
