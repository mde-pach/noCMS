import { describe, expect, test } from "vitest";
import { parseItemPath, reorderArray } from "./item-selection.js";

describe("parseItemPath", () => {
  test("splits key.index into its parts", () => {
    expect(parseItemPath("tiers.1")).toEqual({ key: "tiers", index: 1 });
    expect(parseItemPath("links.0")).toEqual({ key: "links", index: 0 });
  });

  test("rejects values that aren't key.index", () => {
    expect(parseItemPath("tiers")).toBeUndefined();
    expect(parseItemPath("tiers.x")).toBeUndefined();
    expect(parseItemPath(".1")).toBeUndefined();
    expect(parseItemPath("tiers.-1")).toBeUndefined();
  });
});

describe("reorderArray", () => {
  test("moves an element and leaves the source untouched", () => {
    const src = ["a", "b", "c"];
    expect(reorderArray(src, 0, 2)).toEqual(["b", "c", "a"]);
    expect(reorderArray(src, 2, 0)).toEqual(["c", "a", "b"]);
    expect(src).toEqual(["a", "b", "c"]);
  });

  test("an out-of-range move returns an unchanged copy", () => {
    const src = ["a", "b"];
    expect(reorderArray(src, 5, 0)).toEqual(["a", "b"]);
  });
});
