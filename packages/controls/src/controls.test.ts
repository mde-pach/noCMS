import { type CollectionDef, schemaForCollection } from "@nocms/core";
import * as v from "valibot";
import { describe, expect, test } from "vitest";
import { deriveControls } from "./controls";

describe("deriveControls — base types", () => {
  test("maps primitives to their controls", () => {
    const schema = v.object({
      title: v.string(),
      count: v.number(),
      published: v.boolean(),
      size: v.picklist(["sm", "md", "lg"]),
    });
    const byKey = Object.fromEntries(deriveControls(schema).map((c) => [c.key, c]));

    expect(byKey.title?.kind).toBe("text");
    expect(byKey.count?.kind).toBe("number");
    expect(byKey.published?.kind).toBe("boolean");
    expect(byKey.size?.kind).toBe("select");
    expect(byKey.size?.config).toEqual({ options: ["sm", "md", "lg"] });
  });

  test("a bounded number becomes a range with min/max", () => {
    const schema = v.object({
      opacity: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
    });
    const [opacity] = deriveControls(schema);
    expect(opacity?.kind).toBe("range");
    expect(opacity?.config).toEqual({ min: 0, max: 100 });
  });

  test("preserves declaration order", () => {
    const schema = v.object({ b: v.string(), a: v.string(), c: v.string() });
    expect(deriveControls(schema).map((c) => c.key)).toEqual(["b", "a", "c"]);
  });
});

describe("deriveControls — optional, default, labels", () => {
  test("optional fields are not required and capture a default", () => {
    const schema = v.object({
      name: v.string(),
      tagline: v.optional(v.string(), "Hello"),
    });
    const byKey = Object.fromEntries(deriveControls(schema).map((c) => [c.key, c]));

    expect(byKey.name?.required).toBe(true);
    expect(byKey.tagline?.required).toBe(false);
    expect(byKey.tagline?.default).toBe("Hello");
  });

  test("humanizes the key into a label, metadata can override it", () => {
    const schema = v.object({
      heroTitle: v.string(),
      ctaUrl: v.pipe(v.string(), v.metadata({ label: "Button link" })),
    });
    const byKey = Object.fromEntries(deriveControls(schema).map((c) => [c.key, c]));

    expect(byKey.heroTitle?.label).toBe("Hero Title");
    expect(byKey.ctaUrl?.label).toBe("Button link");
  });
});

describe("deriveControls — meta-types win over base type", () => {
  test("a control hint overrides the inferred kind", () => {
    const schema = v.object({
      brand: v.pipe(v.string(), v.metadata({ control: "color" })),
      avatar: v.pipe(v.string(), v.metadata({ control: "image" })),
    });
    const byKey = Object.fromEntries(deriveControls(schema).map((c) => [c.key, c]));

    expect(byKey.brand?.kind).toBe("color");
    expect(byKey.avatar?.kind).toBe("image");
  });

  test("advanced and showIf are read from metadata", () => {
    const schema = v.object({
      alt: v.pipe(
        v.string(),
        v.metadata({ advanced: true, showIf: { key: "src", equals: true } }),
      ),
    });
    const [alt] = deriveControls(schema);
    expect(alt?.advanced).toBe(true);
    expect(alt?.showIf).toEqual({ key: "src", equals: true });
  });

  test("an unknown control hint falls back gracefully (no throw)", () => {
    const schema = v.object({
      fancy: v.pipe(v.string(), v.metadata({ control: "spinner-3000" })),
    });
    const [fancy] = deriveControls(schema);
    // Hint is honoured as an open-set kind; the host decides how to render/fallback.
    expect(fancy?.kind).toBe("spinner-3000");
  });

  test("metadata config merges over the derived config, keeping picklist options", () => {
    const schema = v.object({
      align: v.pipe(
        v.picklist(["start", "center", "end"]),
        v.metadata({ control: "layout-align", config: { mainKey: "justify" } }),
      ),
    });
    const [align] = deriveControls(schema);
    expect(align?.kind).toBe("layout-align");
    expect(align?.config).toEqual({
      options: ["start", "center", "end"],
      mainKey: "justify",
    });
  });
});

describe("deriveControls — nested structure", () => {
  test("a nested object becomes a group with child controls", () => {
    const schema = v.object({
      cta: v.object({ label: v.string(), href: v.string() }),
    });
    const [cta] = deriveControls(schema);
    expect(cta?.kind).toBe("group");
    expect(cta?.children?.map((c) => c.key)).toEqual(["label", "href"]);
  });

  test("an array becomes a list carrying its element control", () => {
    const schema = v.object({ tags: v.array(v.string()) });
    const [tags] = deriveControls(schema);
    expect(tags?.kind).toBe("list");
    expect(tags?.children?.[0]?.kind).toBe("text");
  });
});

describe("deriveControls — same mapper drives collection fields", () => {
  test("enriched FieldDef kinds surface as rich controls", () => {
    const def: CollectionDef = {
      name: "posts",
      path: "content/posts",
      fields: {
        title: { kind: "string", required: true },
        body: { kind: "markdown", required: true },
        cover: { kind: "media", required: false },
        author: { kind: "reference", required: false },
        publishedAt: { kind: "date", required: false },
      },
    };
    const byKey = Object.fromEntries(
      deriveControls(schemaForCollection(def)).map((c) => [c.key, c]),
    );

    expect(byKey.title?.kind).toBe("text");
    expect(byKey.body?.kind).toBe("richtext");
    expect(byKey.cover?.kind).toBe("image");
    expect(byKey.author?.kind).toBe("reference");
    expect(byKey.publishedAt?.kind).toBe("date");

    expect(byKey.title?.required).toBe(true);
    expect(byKey.cover?.required).toBe(false);
  });
});
