import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { buildCatalog, type Catalog } from "../../vite-plugin-tw-catalog";
import { CAPABILITIES, COLOR_TARGETS, relevantFor } from "./capability-map";
import {
  applyClass,
  composeColor,
  currentClass,
  type FeatureLike,
  makeFeatureOf,
  parseColorClass,
  widgetFor,
} from "./controls-core";

// Integration tests: build the *real* engine catalog (same as the Vite plugin), then drive every
// control's logic against it. Catches dead capability references, bad dedupe, broken round-trips,
// and coverage holes — i.e. "every control acts as expected".

const starter = fileURLToPath(new URL("../..", import.meta.url));

let cat: Catalog;
let featureOf: (u: string) => string | undefined;
let byId: Map<string, FeatureLike & { id: string; label: string }>;

beforeAll(async () => {
  cat = await buildCatalog(readFileSync(`${starter}/poc.tokens`, "utf8"), starter);
  featureOf = makeFeatureOf(cat.features);
  byId = new Map(cat.features.map((f) => [f.id, f]));
}, 30000);

const valid = (cls: string) => featureOf(cls) !== undefined;
const apply = (cn: string, cls: string, fid: string, v = "") =>
  applyClass(cn, cls, fid, v, featureOf);
const current = (cn: string, fid: string, v = "") =>
  currentClass(cn, fid, v, featureOf);
const tokenColorKey = () => {
  const fam = cat.colors.find((c) => c.isToken && c.shades.length);
  return (fam?.shades[0]?.cls ?? "bg-x").replace(/^bg-/, "");
};

describe("capability map references real engine properties", () => {
  it("every slider/dropdown/segmented/toggle control points at an existing feature", () => {
    const missing: string[] = [];
    for (const cap of CAPABILITIES)
      for (const c of cap.controls)
        if (c.kind !== "color" && c.kind !== "box" && !byId.has(c.feature))
          missing.push(`${cap.id}:${c.feature}`);
    expect(missing).toEqual([]);
  });

  it("every box control's scale feature exists and composes valid classes for each side", () => {
    for (const cap of CAPABILITIES)
      for (const c of cap.controls) {
        if (c.kind !== "box") continue;
        const scale = byId.get(c.scale);
        expect(scale, `${cap.id} scale ${c.scale}`).toBeTruthy();
        if (!scale) continue;
        const key = scaleKeyOf(scale);
        for (const prefix of Object.values(c.targets))
          expect(valid(`${prefix}${key}`), `${prefix}${key}`).toBe(true);
      }
  });

  it("every relevant-by-element capability id exists", () => {
    const ids = new Set(CAPABILITIES.map((c) => c.id));
    for (const tag of ["h1", "h2", "p", "div", "button", "a", "section", "img"])
      for (const id of relevantFor(tag)) expect(ids.has(id), `${tag}:${id}`).toBe(true);
  });
});

describe("color dimension generates valid classes for every target", () => {
  it("each colour target prefix + a token colour is an engine class", () => {
    const key = tokenColorKey();
    for (const t of COLOR_TARGETS)
      expect(valid(`${t.prefix}${key}`), `${t.prefix}${key}`).toBe(true);
  });

  it("composeColor / parseColorClass round-trip (with and without opacity)", () => {
    expect(composeColor("bg-", "brand-600", 40)).toBe("bg-brand-600/40");
    expect(composeColor("bg-", "ink", 100)).toBe("bg-ink");
    expect(parseColorClass("bg-brand-600/40", "bg-")).toEqual({
      key: "brand-600",
      opacity: 40,
    });
    expect(parseColorClass("bg-ink", "bg-")).toEqual({ key: "ink", opacity: 100 });
  });
});

describe("apply / current behave as expected", () => {
  it("applying replaces the same property and keeps others", () => {
    expect(apply("bg-blue-500 p-4", "bg-red-500", "background-color")).toBe(
      "p-4 bg-red-500",
    );
  });
  it("dedupe is modifier-aware (opacity) and variant-scoped", () => {
    expect(apply("bg-blue-500/30 p-4", "bg-red-500", "background-color")).toBe(
      "p-4 bg-red-500",
    );
    expect(apply("bg-blue-500 md:bg-green-500", "bg-red-500", "background-color")).toBe(
      "md:bg-green-500 bg-red-500",
    );
  });
  it("empty class clears the feature", () => {
    expect(apply("bg-blue-500 p-4", "", "background-color")).toBe("p-4");
  });
  it("current reads back the applied class, per variant", () => {
    expect(current("bg-brand-500/40 p-4", "background-color")).toBe("bg-brand-500/40");
    expect(current("md:bg-brand-500", "background-color", "md:")).toBe("bg-brand-500");
    expect(current("bg-brand-500", "background-color", "md:")).toBeUndefined();
  });
});

describe("widget selection and no-property-left-behind", () => {
  it("picks the right widget by feature type", () => {
    expect(widgetFor(byId.get("background-color")!)).toBe("color");
    expect(widgetFor(byId.get("cursor")!)).toBe("dropdown"); // many keywords
    expect(widgetFor(byId.get("flex-wrap")!)).toBe("segmented"); // few keywords
    expect(widgetFor(byId.get("opacity")!)).toBe("slider"); // number
  });

  it("every one of the engine's properties renders a real control (a widget with options)", () => {
    const broken = cat.features.filter(
      (f) =>
        f.options.length === 0 ||
        !["color", "dropdown", "segmented", "slider"].includes(widgetFor(f)),
    );
    expect(broken.map((f) => f.id)).toEqual([]);
    expect(cat.features.length).toBeGreaterThan(200);
  });
});

function scaleKeyOf(f: FeatureLike): string {
  const mid = f.options[Math.floor(f.options.length / 2)] ?? f.options[0];
  return mid && mid.cls.startsWith(f.prefix) ? mid.cls.slice(f.prefix.length) : "0";
}
