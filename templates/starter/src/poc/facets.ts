import { cssVarName, type Token } from "@nocms/tokens";
import { optionLabel } from "./labels";

// A generic Tailwind parser can't read noCMS utilities — `bg-brand-500`/`p-lg` are *custom* theme
// keys no off-the-shelf lib knows. But we generate the `@theme` from the token file, so we own the
// vocabulary: scales, facets, and controls all derive from the same tokens that produced the
// utilities, and the controls can't drift from what actually exists.

export type ScaleKind = "color" | "space" | "radius" | "shadow" | "font";

export interface Option {
  key: string;
  label: string;
  /** Live CSS value to preview the option (a `var(--…)` for tokens), so swatches track the theme. */
  preview?: string;
}

export type Scales = Record<ScaleKind, Option[]>;

const TOKEN_SCALE: Record<string, ScaleKind> = {
  color: "color",
  space: "space",
  radius: "radius",
  shadow: "shadow",
  font: "font",
};

export function deriveScales(tokens: Token[]): Scales {
  const scales: Scales = { color: [], space: [], radius: [], shadow: [], font: [] };
  for (const token of tokens) {
    const [head, ...rest] = token.name.split(".");
    const kind = head && TOKEN_SCALE[head];
    if (!kind || rest.length === 0) continue;
    const key = rest.join("-");
    scales[kind].push({
      key,
      label: optionLabel(kind, key),
      preview: `var(${cssVarName(token.name)})`,
    });
  }
  return scales;
}

export type Render = "swatch" | "steps";

export interface Facet {
  id: string;
  label: string;
  /** Utility prefix, dash included — `bg-`, `rounded-`, `shadow-`. */
  prefix: string;
  group: "Color" | "Spacing" | "Border" | "Effects" | "Type";
  render: Render;
  /** Token-derived options… */
  scale?: ScaleKind;
  /** …or a fixed set, for utilities that aren't theme-driven (opacity, tracking, align). */
  fixed?: Option[];
}

const fixed = (...keys: [string, string][]): Option[] =>
  keys.map(([key, label]) => ({ key, label }));

// The full registry. `defaultEligible` is implicit: a facet shows by default only when the
// component's own classes already use it (parsed below); everything else is reachable via "+ Add".
export const FACETS: Facet[] = [
  {
    id: "bg",
    label: "Background",
    prefix: "bg-",
    group: "Color",
    render: "swatch",
    scale: "color",
  },
  {
    id: "text",
    label: "Text color",
    prefix: "text-",
    group: "Color",
    render: "swatch",
    scale: "color",
  },
  {
    id: "border-color",
    label: "Border color",
    prefix: "border-",
    group: "Color",
    render: "swatch",
    scale: "color",
  },
  {
    id: "p",
    label: "Padding",
    prefix: "p-",
    group: "Spacing",
    render: "steps",
    scale: "space",
  },
  {
    id: "px",
    label: "Padding X",
    prefix: "px-",
    group: "Spacing",
    render: "steps",
    scale: "space",
  },
  {
    id: "py",
    label: "Padding Y",
    prefix: "py-",
    group: "Spacing",
    render: "steps",
    scale: "space",
  },
  {
    id: "gap",
    label: "Spacing between",
    prefix: "gap-",
    group: "Spacing",
    render: "steps",
    scale: "space",
  },
  {
    id: "mt",
    label: "Margin top",
    prefix: "mt-",
    group: "Spacing",
    render: "steps",
    scale: "space",
  },
  {
    id: "radius",
    label: "Corners",
    prefix: "rounded-",
    group: "Border",
    render: "steps",
    scale: "radius",
  },
  {
    id: "shadow",
    label: "Shadow",
    prefix: "shadow-",
    group: "Effects",
    render: "steps",
    scale: "shadow",
  },
  {
    id: "opacity",
    label: "Opacity",
    prefix: "opacity-",
    group: "Effects",
    render: "steps",
    fixed: fixed(["100", "100%"], ["75", "75%"], ["50", "50%"], ["25", "25%"]),
  },
  {
    id: "font",
    label: "Font",
    prefix: "font-",
    group: "Type",
    render: "steps",
    scale: "font",
  },
  {
    id: "weight",
    label: "Weight",
    prefix: "font-",
    group: "Type",
    render: "steps",
    fixed: fixed(
      ["normal", "Normal"],
      ["medium", "Medium"],
      ["semibold", "Semibold"],
      ["bold", "Bold"],
    ),
  },
  {
    id: "tracking",
    label: "Letter spacing",
    prefix: "tracking-",
    group: "Type",
    render: "steps",
    fixed: fixed(
      ["tight", "Tight"],
      ["normal", "Normal"],
      ["wide", "Wide"],
      ["wider", "Wider"],
    ),
  },
  {
    id: "align",
    label: "Text align",
    prefix: "text-",
    group: "Type",
    render: "steps",
    fixed: fixed(["left", "Left"], ["center", "Center"], ["right", "Right"]),
  },
];

export const FACET_BY_ID = new Map(FACETS.map((f) => [f.id, f]));

export function optionsOf(facet: Facet, scales: Scales): Option[] {
  return facet.fixed ?? (facet.scale ? scales[facet.scale] : []);
}

/** Split a class into its variant chain (`md:hover:`) and the bare utility. */
function splitVariant(cls: string): { variant: string; util: string } {
  const i = cls.lastIndexOf(":");
  return i === -1
    ? { variant: "", util: cls }
    : { variant: cls.slice(0, i + 1), util: cls.slice(i + 1) };
}

/** Resolve a facet for a bare utility only when its value is a real option for that facet. */
function facetOf(
  util: string,
  scales: Scales,
): { facet: Facet; key: string } | undefined {
  for (const facet of FACETS) {
    if (!util.startsWith(facet.prefix)) continue;
    const key = util.slice(facet.prefix.length);
    if (optionsOf(facet, scales).some((o) => o.key === key)) return { facet, key };
  }
  return undefined;
}

export interface ParsedClasses {
  /** facet id → current option key, for the active variant only. */
  values: Record<string, string>;
  /** Classes in the active variant we don't model — preserved verbatim (the escape hatch). */
  passthrough: string[];
}

export function parseClasses(
  className: string,
  scales: Scales,
  variant = "",
): ParsedClasses {
  const values: Record<string, string> = {};
  const passthrough: string[] = [];
  for (const cls of className.split(/\s+/).filter(Boolean)) {
    const { variant: v, util } = splitVariant(cls);
    if (v !== variant) continue; // belongs to another mode — left untouched
    const hit = facetOf(util, scales);
    if (hit) values[hit.facet.id] = hit.key;
    else passthrough.push(cls);
  }
  return { values, passthrough };
}

/** Set or clear one facet in one variant (empty key clears it); every other class is untouched. */
export function applyFacet(
  className: string,
  facet: Facet,
  key: string,
  scales: Scales,
  variant = "",
): string {
  const kept = className
    .split(/\s+/)
    .filter(Boolean)
    .filter((cls) => {
      const { variant: v, util } = splitVariant(cls);
      if (v !== variant) return true; // other mode — keep
      return facetOf(util, scales)?.facet.id !== facet.id;
    });
  if (key) kept.push(`${variant}${facet.prefix}${key}`);
  return kept.join(" ");
}

/** Facet ids the component ships with — its default editable surface (base variant). */
export function defaultFacetIds(className: string, scales: Scales): string[] {
  return Object.keys(parseClasses(className, scales).values);
}

// Responsive/hover variants key off the real viewport/pointer, which the editor can't fake by
// resizing a box. For preview we flatten the active mode's variants onto the base cascade — base
// first, then each variant prefix in order — so the canvas shows the simulated mode live.
//
// It must be facet-aware: same-property Tailwind utilities resolve by *stylesheet* order, not
// class-attribute order, so an appended `bg-paper` won't beat a base `bg-surface`. Real responsive
// avoids this (the media query wins when active); the simulation must mirror it by dropping the
// base utility of the same facet before layering the override.
export function flattenForPreview(
  className: string,
  order: string[],
  scales: Scales,
): string {
  const classes = className.split(/\s+/).filter(Boolean);
  let result = classes.filter((c) => splitVariant(c).variant === "");
  for (const prefix of order) {
    for (const c of classes) {
      const { variant, util } = splitVariant(c);
      if (variant !== prefix) continue;
      const hit = facetOf(util, scales);
      if (hit)
        result = result.filter(
          (r) => facetOf(splitVariant(r).util, scales)?.facet.id !== hit.facet.id,
        );
      result.push(util);
    }
  }
  return result.join(" ");
}
