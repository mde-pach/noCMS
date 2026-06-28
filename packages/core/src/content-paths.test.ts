import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { enumerateContentPaths } from "./content-paths";

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
