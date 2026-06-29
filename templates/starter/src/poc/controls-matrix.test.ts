import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  applyClass,
  CAP,
  CAPABILITIES,
  type Capability,
  type Catalog,
  COLOR_TARGETS,
  type ControlDef,
  composeColor,
  createCatalogApi,
  currentClass,
  type Feature,
  type FeatureLike,
  makeFeatureOf,
  parseColorClass,
  preferNamed,
  previewOrder,
  relevantFor,
  STATES,
  type StateKey,
  splitVariant,
  VIEWPORTS,
  type ViewportKey,
  variantOf,
  widgetFor,
} from "@nocms/style-controls";
import { buildCatalog } from "@nocms/style-controls/build";
import { beforeAll, describe, expect, it } from "vitest";

// The "every Tailwind control on every relevant DOM node" guarantee. Builds the *real* engine
// catalog (same as the Vite plugin) and drives every capability's every control against it: each
// control must reference a live feature/scale, compose a class the catalog resolves back to that
// feature, round-trip through current()/clear, and survive per-variant mode composition. A dead
// feature reference, a bad class composition, or a broken round-trip turns this red.

const starter = fileURLToPath(new URL("../..", import.meta.url));

let cat: Catalog;
let api: ReturnType<typeof createCatalogApi>;
let featureOf: (u: string) => string | undefined;
let byId: Map<string, Feature>;

beforeAll(async () => {
  cat = await buildCatalog(readFileSync(`${starter}/poc.tokens`, "utf8"), starter);
  api = createCatalogApi(cat);
  featureOf = makeFeatureOf(cat.features);
  byId = new Map(cat.features.map((f) => [f.id, f]));
}, 30000);

const valid = (cls: string) => featureOf(cls) !== undefined;
const apply = (cn: string, cls: string, fid: string, v = "") =>
  applyClass(cn, cls, fid, v, featureOf);
const current = (cn: string, fid: string, v = "") =>
  currentClass(cn, fid, v, featureOf);

const keyOf = (f: FeatureLike, o: { cls: string }) =>
  o.cls.startsWith(f.prefix) ? o.cls.slice(f.prefix.length) : o.cls;

const feat = (id: string): Feature => {
  const f = byId.get(id);
  if (!f) throw new Error(`no feature: ${id}`);
  return f;
};
const fidOf = (cls: string): string => {
  const id = featureOf(cls);
  if (!id) throw new Error(`unresolved class: ${cls}`);
  return id;
};

// A representative non-empty option for a scale feature (skip the "0" no-op when a real step exists).
const sampleOption = (f: Feature): { cls: string } => {
  const real = f.options.find((o) => keyOf(f, o) !== "0");
  return (
    real ??
    f.options[Math.floor(f.options.length / 2)] ??
    f.options[0] ?? { cls: f.prefix }
  );
};

// Every value-bearing control (slider/dropdown/segmented/toggle) flattened with its capability.
const valueControls: { cap: Capability; c: ControlDef & { feature: string } }[] = [];
const boxControls: { cap: Capability; c: ControlDef & { box: string } }[] = [];
for (const cap of CAPABILITIES)
  for (const c of cap.controls) {
    if (c.kind === "box") boxControls.push({ cap, c });
    else if (c.kind !== "color") valueControls.push({ cap, c });
  }

const COMPONENT_TAGS = [
  "header",
  "footer",
  "nav",
  "aside",
  "figure",
  "label",
  "hr",
  "section",
  "div",
  "button",
  "a",
  "h1",
  "h2",
  "h3",
  "p",
  "span",
  "img",
];

describe("every value control references a live feature and round-trips a class", () => {
  it.each(
    valueControls.map(({ cap, c }) => [`${cap.id} / ${c.feature}`, cap, c] as const),
  )("%s", (_name, _cap, c) => {
    const f = byId.get(c.feature);
    expect(f, `feature ${c.feature} missing from catalog`).toBeTruthy();
    if (!f) return;
    expect(f.options.length, `${c.feature} has no options`).toBeGreaterThan(0);

    if (c.kind === "toggle") {
      // The `on` class is a real class for the feature; apply sets it, toggling off clears it.
      expect(valid(c.on), `toggle class ${c.on}`).toBe(true);
      expect(featureOf(c.on)).toBe(c.feature);
      const on = apply("p-4", c.on, c.feature);
      expect(current(on, c.feature)).toBe(c.on);
      const off = apply(on, "", c.feature);
      expect(current(off, c.feature)).toBeUndefined();
      return;
    }

    const opt = sampleOption(f);
    // Applying a catalog option must compose a class the catalog resolves *back* to this feature.
    expect(valid(opt.cls), `option ${opt.cls}`).toBe(true);
    expect(featureOf(opt.cls)).toBe(c.feature);
    const set = apply("p-4 text-ink", opt.cls, c.feature);
    expect(current(set, c.feature)).toBe(opt.cls);
    expect(set.includes("p-4")).toBe(true); // sibling untouched
    const cleared = apply(set, "", c.feature);
    expect(current(cleared, c.feature)).toBeUndefined();
  });
});

describe("every box control composes a valid class for each side, independently", () => {
  it.each(
    boxControls.map(({ cap, c }) => [`${cap.id}`, cap, c] as const),
  )("%s", (_name, _cap, c) => {
    if (c.kind !== "box") return;
    const scale = byId.get(c.scale);
    expect(scale, `box scale ${c.scale} missing`).toBeTruthy();
    if (!scale) return;
    const key = keyOf(scale, sampleOption(scale));
    const prefixes = Object.values(c.targets);

    // Each side prefix + a real scale key is a catalog class.
    for (const prefix of prefixes)
      expect(valid(`${prefix}${key}`), `${prefix}${key}`).toBe(true);

    // Setting one side leaves the other sides intact (each side is its own feature id).
    let cn = "";
    for (const prefix of prefixes) {
      const cls = `${prefix}${key}`;
      cn = apply(cn, cls, fidOf(cls));
    }
    for (const prefix of prefixes) {
      const cls = `${prefix}${key}`;
      expect(current(cn, fidOf(cls)), `round-trip ${cls}`).toBe(cls);
    }
  });
});

describe("color controls compose valid classes for every target × family", () => {
  const tokenKeys = () => {
    const fam = cat.colors.find((c) => c.isToken && c.shades.length);
    return (fam?.shades[0]?.cls ?? "bg-x").replace(/^bg-/, "");
  };
  const paletteKeys = () => {
    const fam = cat.colors.find((c) => !c.isToken && c.shades.length);
    return (fam?.shades[0]?.cls ?? "bg-x").replace(/^bg-/, "");
  };

  it.each(
    COLOR_TARGETS.map((t) => [t.prefix, t] as const),
  )("%s composes token + palette colours that resolve and round-trip", (prefix) => {
    for (const key of [tokenKeys(), paletteKeys()]) {
      const solid = composeColor(prefix, key, 100);
      expect(valid(solid), solid).toBe(true);
      expect(parseColorClass(solid, prefix)).toEqual({ key, opacity: 100 });

      const faded = composeColor(prefix, key, 40);
      expect(faded).toBe(`${prefix}${key}/40`);
      expect(parseColorClass(faded, prefix)).toEqual({ key, opacity: 40 });
      expect(valid(faded), `${faded} resolves modifier-aware`).toBe(true);
    }
  });

  // Spec: every colour target the configurator offers must resolve to a real catalog feature, so
  // applying a second colour *replaces* the first (no accumulation) and the panel can read the
  // current value back. This holds the engine to what the UI promises, not to its current map.
  it.each(
    COLOR_TARGETS.map((t) => [t.prefix, t.label] as const),
  )("%s (%s) target dedups and reads back", (prefix) => {
    const fid = api.colorFeatureId(prefix);
    expect(fid, `colorFeatureId('${prefix}') must resolve a feature`).not.toBe("");
    expect(byId.has(fid), `feature '${fid}' exists in catalog`).toBe(true);

    const a = composeColor(prefix, tokenKeys(), 100);
    const b = composeColor(prefix, paletteKeys(), 100);
    const after = apply(apply("", a, fid), b, fid);
    expect(after.split(/\s+/).filter(Boolean), "second colour replaces first").toEqual([
      b,
    ]);
    expect(current(after, fid), "current colour reads back").toBe(b);
  });
});

describe("relevance: every control shown on every node is wired to a real feature", () => {
  const tags = [...new Set([...Object.keys(relevantForTags()), ...COMPONENT_TAGS])];

  function relevantForTags(): Record<string, string[]> {
    // Probe the exported RELEVANCE map via relevantFor for the documented tag set.
    const known = [
      "h1",
      "h2",
      "h3",
      "p",
      "span",
      "div",
      "button",
      "a",
      "section",
      "header",
      "footer",
      "nav",
      "aside",
      "figure",
      "label",
      "hr",
      "img",
    ];
    return Object.fromEntries(known.map((t) => [t, relevantFor(t)]));
  }

  it.each(tags.map((t) => [t] as const))("%s", (tag) => {
    const ids = relevantFor(tag);
    expect(ids.length, `${tag} has no relevant capabilities`).toBeGreaterThan(0);
    for (const id of ids) {
      const cap = CAP.get(id);
      expect(cap, `relevantFor(${tag}) → unknown capability "${id}"`).toBeTruthy();
      if (!cap) continue;
      for (const c of cap.controls) {
        if (c.kind === "color") continue;
        if (c.kind === "box") {
          expect(byId.has(c.scale), `${id}.${c.scale}`).toBe(true);
          for (const prefix of Object.values(c.targets)) {
            const scale = feat(c.scale);
            const key = keyOf(scale, sampleOption(scale));
            expect(valid(`${prefix}${key}`), `${id}: ${prefix}${key}`).toBe(true);
          }
        } else {
          expect(byId.has(c.feature), `${id}.${c.feature}`).toBe(true);
        }
      }
    }
  });
});

describe("widgetFor picks the right compact widget for every feature", () => {
  it("named anchors map as documented", () => {
    expect(widgetFor(feat("background-color"))).toBe("color");
    expect(widgetFor(feat("opacity"))).toBe("slider");
    expect(["segmented", "dropdown"]).toContain(widgetFor(feat("text-align")));
  });

  it("every feature gets a defined widget with options, honouring the enum count rule", () => {
    const bad: string[] = [];
    for (const f of cat.features) {
      const w = widgetFor(f);
      if (!["color", "dropdown", "segmented", "slider"].includes(w)) bad.push(f.id);
      if (f.options.length === 0) bad.push(`${f.id}:no-options`);
      if (f.control === "enum") {
        const want = f.options.length > 5 ? "dropdown" : "segmented";
        if (w !== want) bad.push(`${f.id}:enum-widget`);
      }
      if (f.control === "color" && w !== "color") bad.push(`${f.id}:color-widget`);
    }
    expect(bad).toEqual([]);
    expect(cat.features.length).toBeGreaterThan(200);
  });
});

describe("variant composition across viewport × state axes (the Mode Bar)", () => {
  it("variantOf builds the Tailwind prefix for representative modes", () => {
    expect(variantOf("base", "default")).toBe("");
    expect(variantOf("md", "default")).toBe("md:");
    expect(variantOf("base", "hover")).toBe("hover:");
    expect(variantOf("md", "hover")).toBe("md:hover:");
  });

  it("axes are independent: md / hover / md:hover coexist for one feature", () => {
    let cn = "";
    const fid = "background-color";
    cn = apply(cn, "bg-brand-500", fid, "");
    cn = apply(cn, "bg-accent-500", fid, "md:");
    cn = apply(cn, "bg-ink", fid, "hover:");
    cn = apply(cn, "bg-paper", fid, "md:hover:");

    expect(current(cn, fid, "")).toBe("bg-brand-500");
    expect(current(cn, fid, "md:")).toBe("bg-accent-500");
    expect(current(cn, fid, "hover:")).toBe("bg-ink");
    expect(current(cn, fid, "md:hover:")).toBe("bg-paper");

    // Replacing one variant's value leaves the other three untouched.
    cn = apply(cn, "bg-surface", fid, "md:");
    expect(current(cn, fid, "md:")).toBe("bg-surface");
    expect(current(cn, fid, "")).toBe("bg-brand-500");
    expect(current(cn, fid, "hover:")).toBe("bg-ink");
    expect(current(cn, fid, "md:hover:")).toBe("bg-paper");
    // Exactly one class per axis — no leaked duplicates.
    const bgClasses = cn
      .split(/\s+/)
      .filter((c) => featureOf(splitVariant(c).util) === fid);
    expect(bgClasses.length).toBe(4);
  });

  it("currentClass reads back the per-variant value, never another variant's", () => {
    const cn = "md:bg-accent-500 bg-brand-500";
    expect(current(cn, "background-color", "md:")).toBe("bg-accent-500");
    expect(current(cn, "background-color", "")).toBe("bg-brand-500");
    expect(current(cn, "background-color", "lg:")).toBeUndefined();
  });

  it("previewOrder returns the mobile-first cascade for representative modes", () => {
    expect(previewOrder("base", "default")).toEqual([]);
    expect(previewOrder("md", "default")).toEqual(["sm:", "md:"]);
    expect(previewOrder("base", "hover")).toEqual(["hover:"]);
    expect(previewOrder("md", "hover")).toEqual([
      "sm:",
      "md:",
      "hover:",
      "sm:hover:",
      "md:hover:",
    ]);
  });

  it("every viewport × state pair yields a coherent variant + cascade", () => {
    for (const vp of VIEWPORTS.map((v) => v.key as ViewportKey))
      for (const st of STATES.map((s) => s.key as StateKey)) {
        const variant = variantOf(vp, st);
        const order = previewOrder(vp, st);
        // The active variant is the last (most specific) entry of a non-empty cascade.
        if (variant) expect(order[order.length - 1]).toBe(variant);
        else expect(order).toEqual([]);
      }
  });
});

describe("amount controls expose named design steps, not the raw numeric scale", () => {
  it("padding shows sm/md/lg ramp, opacity keeps its numbers", () => {
    const pad = feat("padding");
    const padKeys = preferNamed(pad.options, (o) => keyOf(pad, o)).map((o) =>
      keyOf(pad, o),
    );
    expect(padKeys).toContain("md");
    expect(padKeys.every((k) => !/^[\d.]+$/.test(k))).toBe(true);

    const op = feat("opacity");
    expect(preferNamed(op.options, (o) => keyOf(op, o)).length).toBe(op.options.length);
  });
});
