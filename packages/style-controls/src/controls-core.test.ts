import { describe, expect, it } from "vitest";
import {
  applyClass,
  composeColor,
  currentClass,
  type FeatureLike,
  flattenForPreview,
  makeFeatureOf,
  parseColorClass,
  preferNamed,
  splitVariant,
  widgetFor,
} from "./controls-core";

// A tiny fake catalog: just enough class→feature mapping to drive the pure class algebra without
// loading the Tailwind engine (that path is exercised by the starter's integration test).
const featureOf = makeFeatureOf([
  { id: "background-color", classes: ["bg-red-500", "bg-blue-500", "bg-brand-500"] },
  { id: "padding", classes: ["p-4", "p-8"] },
]);

describe("variant splitting", () => {
  it("separates a variant prefix from its utility", () => {
    expect(splitVariant("md:bg-red-500")).toEqual({
      variant: "md:",
      util: "bg-red-500",
    });
    expect(splitVariant("bg-red-500")).toEqual({ variant: "", util: "bg-red-500" });
  });
});

describe("colour compose / parse round-trip", () => {
  it("composes and parses with and without opacity", () => {
    expect(composeColor("bg-", "brand-600", 40)).toBe("bg-brand-600/40");
    expect(composeColor("bg-", "ink", 100)).toBe("bg-ink");
    expect(parseColorClass("bg-brand-600/40", "bg-")).toEqual({
      key: "brand-600",
      opacity: 40,
    });
  });
});

describe("apply / current", () => {
  it("replaces the same property and keeps others, scoped by variant", () => {
    expect(
      applyClass("bg-blue-500 p-4", "bg-red-500", "background-color", "", featureOf),
    ).toBe("p-4 bg-red-500");
    expect(applyClass("bg-blue-500 p-4", "", "background-color", "", featureOf)).toBe(
      "p-4",
    );
    expect(currentClass("bg-brand-500 p-4", "background-color", "", featureOf)).toBe(
      "bg-brand-500",
    );
  });

  it("flattens an active mode's variants onto the base cascade", () => {
    expect(flattenForPreview("bg-blue-500 md:bg-red-500", ["md:"], featureOf)).toBe(
      "bg-red-500",
    );
  });
});

describe("named-step preference and widget selection", () => {
  it("keeps named steps over the raw numeric scale", () => {
    const items = [{ k: "4" }, { k: "md" }, { k: "8" }];
    expect(preferNamed(items, (i) => i.k).map((i) => i.k)).toEqual(["md"]);
  });

  it("picks a widget by control type and option count", () => {
    const f = (control: string, n: number): FeatureLike => ({
      control,
      prefix: "x-",
      options: Array.from({ length: n }, (_, i) => ({
        cls: `x-${i}`,
        value: `${i}`,
        label: `${i}`,
      })),
    });
    expect(widgetFor(f("color", 3))).toBe("color");
    expect(widgetFor(f("enum", 8))).toBe("dropdown");
    expect(widgetFor(f("enum", 3))).toBe("segmented");
    expect(widgetFor(f("length", 6))).toBe("slider");
  });
});
