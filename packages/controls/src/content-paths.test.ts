import * as v from "valibot";
import { describe, expect, it } from "vitest";
import {
  arrayElementShape,
  enumerateContentPaths,
  enumerateItemPaths,
} from "./content-paths";
import { deriveControls } from "./controls";

// Mirrors a real section schema (cf. components' Features): array of objects holding display
// text, a number, and a picklist. Only the display-text leaves should be anchored.
const Item = v.object({
  icon: v.optional(v.string()),
  title: v.string(),
  body: v.optional(v.string()),
});

const SectionSchema = v.object({
  title: v.pipe(v.string(), v.metadata({ control: "richtext" })),
  columns: v.pipe(v.number(), v.minValue(2), v.maxValue(4)),
  variant: v.picklist(["page", "brand"]),
  items: v.array(Item),
});

describe("enumerateContentPaths", () => {
  it("expands array elements by the value's actual length, keyed by index", () => {
    const value = {
      title: "Features",
      columns: 3,
      variant: "page",
      items: [
        { icon: "◆", title: "Repo is the DB", body: "git all the way" },
        { icon: "✎", title: "Edit in-site", body: "publish on click" },
      ],
    };

    const paths = enumerateContentPaths(SectionSchema, value).map((p) => p.path);

    expect(paths).toEqual([
      "title",
      "items.0.icon",
      "items.0.title",
      "items.0.body",
      "items.1.icon",
      "items.1.title",
      "items.1.body",
    ]);
  });

  it("excludes logic and non-display props (number, picklist)", () => {
    const value = { title: "x", columns: 3, variant: "brand", items: [] };
    const paths = enumerateContentPaths(SectionSchema, value).map((p) => p.path);
    expect(paths).not.toContain("columns");
    expect(paths).not.toContain("variant");
  });

  it("skips absent optional leaves — only present strings are anchored", () => {
    const value = {
      title: "x",
      columns: 3,
      variant: "page",
      items: [{ title: "only a title" }],
    };
    const paths = enumerateContentPaths(SectionSchema, value).map((p) => p.path);
    expect(paths).toEqual(["title", "items.0.title"]);
  });

  it("carries each leaf's current value", () => {
    const value = {
      title: "Heading",
      columns: 2,
      variant: "page",
      items: [{ title: "Card" }],
    };
    const byPath = Object.fromEntries(
      enumerateContentPaths(SectionSchema, value).map((p) => [p.path, p.value]),
    );
    expect(byPath["items.0.title"]).toBe("Card");
    expect(byPath.title).toBe("Heading");
  });
});

describe("enumerateItemPaths", () => {
  const controls = deriveControls(SectionSchema);

  it("emits one item per object-array element, keyed by array + index", () => {
    const value = {
      title: "x",
      columns: 3,
      variant: "page",
      items: [{ title: "A" }, { title: "B" }, { title: "C" }],
    };
    expect(enumerateItemPaths(controls, value)).toEqual([
      { path: "items.0", key: "items", index: 0 },
      { path: "items.1", key: "items", index: 1 },
      { path: "items.2", key: "items", index: 2 },
    ]);
  });

  it("includes string arrays — a list of strings is a list of reorderable rows", () => {
    const withTags = deriveControls(
      v.object({ title: v.string(), tags: v.array(v.string()) }),
    );
    expect(enumerateItemPaths(withTags, { title: "x", tags: ["a", "b"] })).toEqual([
      { path: "tags.0", key: "tags", index: 0 },
      { path: "tags.1", key: "tags", index: 1 },
    ]);
  });

  it("recurses into object items — a nested array's elements are items too", () => {
    const tiers = deriveControls(
      v.object({
        tiers: v.array(v.object({ name: v.string(), features: v.array(v.string()) })),
      }),
    );
    const value = {
      tiers: [
        { name: "Hobby", features: ["1 site", "Community"] },
        { name: "Pro", features: ["Unlimited"] },
      ],
    };
    expect(enumerateItemPaths(tiers, value)).toEqual([
      { path: "tiers.0", key: "tiers", index: 0 },
      { path: "tiers.0.features.0", key: "tiers.0.features", index: 0 },
      { path: "tiers.0.features.1", key: "tiers.0.features", index: 1 },
      { path: "tiers.1", key: "tiers", index: 1 },
      { path: "tiers.1.features.0", key: "tiers.1.features", index: 0 },
    ]);
  });

  it("returns nothing for an empty array", () => {
    const value = { title: "x", columns: 2, variant: "page", items: [] };
    expect(enumerateItemPaths(controls, value)).toEqual([]);
  });
});

describe("arrayElementShape", () => {
  const tiers = deriveControls(
    v.object({
      tiers: v.array(v.object({ name: v.string(), features: v.array(v.string()) })),
      tags: v.array(v.string()),
    }),
  );

  it("matches sibling string lists across the tree (a feature fits any string list)", () => {
    const a = arrayElementShape(tiers, "tiers.0.features");
    const b = arrayElementShape(tiers, "tiers.1.features");
    const c = arrayElementShape(tiers, "tags");
    expect(a).toBe("text");
    expect(b).toBe(a);
    expect(c).toBe(a); // a feature can move into `tags` — same shape
  });

  it("object lists match only same-shaped object lists, not string lists", () => {
    const tierShape = arrayElementShape(tiers, "tiers");
    expect(tierShape).toContain("name:text");
    expect(tierShape).not.toBe(arrayElementShape(tiers, "tags"));
  });

  it("is undefined for a non-array key", () => {
    expect(arrayElementShape(tiers, "tiers.0.name")).toBeUndefined();
  });
});
