import { cssVarName, type Token } from "@nocms/tokens";
import { optionLabel } from "./labels";

// A generic Tailwind parser can't read noCMS utilities — `bg-brand-500`/`p-lg` are *custom* theme
// keys no off-the-shelf lib knows. But we generate the `@theme` from the token file, so we own the
// vocabulary: scales, facets, and controls all derive from the same tokens that produced the
// utilities, and the controls can't drift from what actually exists.

export type ScaleKind = "color" | "space" | "radius" | "shadow" | "font" | "size";

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
  text: "size",
};

export function deriveScales(tokens: Token[]): Scales {
  const scales: Scales = {
    color: [],
    space: [],
    radius: [],
    shadow: [],
    font: [],
    size: [],
  };
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
/** Type of a free-form value, so the control knows which input to show. */
export type CustomKind = "color" | "length";
export type Group = "Color" | "Spacing" | "Border" | "Type" | "Effects" | "Motion";

export interface Facet {
  id: string;
  label: string;
  /** Utility prefix, dash included — `bg-`, `rounded-`, `shadow-`. */
  prefix: string;
  group: Group;
  render: Render;
  /** Token-derived options… */
  scale?: ScaleKind;
  /** …or a fixed Tailwind scale, for utilities that aren't theme-driven (opacity, tracking…). */
  fixed?: Option[];
  /** A typed arbitrary value (`[…]`), where unambiguous — the always-available escape hatch. */
  custom?: CustomKind;
  hint?: string;
  example?: string;
  doc?: string;
}

const DOC = "https://tailwindcss.com/docs/";
const fixed = (...keys: [string, string][]): Option[] =>
  keys.map(([key, label]) => ({ key, label }));

// ── The systematic registry ─────────────────────────────────────────────────────────────────────
// Tailwind utilities are regular: a *value source* (a theme namespace or a built-in scale) combined
// with a set of *CSS targets* that draw from it. The facet list is GENERATED from that structure
// rather than enumerated one-property-at-a-time — so widening coverage is data (one row, or one
// token), never new parsing code. Three layers make the user autonomous without us pre-listing
// every feature: (1) presets come from the theme; (2) the catalog is generated from the namespace
// structure; (3) every facet also takes a typed arbitrary value, so a missing preset never blocks.

type ColorTarget = {
  id: string;
  label: string;
  prefix: string;
  custom?: boolean;
  hint: string;
  doc: string;
};
// CSS properties that take a theme colour. `custom` opens a colour picker; `text-` is left without
// one so an arbitrary `text-[…]` is unambiguously a font-size, not a colour.
const COLOR_TARGETS: ColorTarget[] = [
  {
    id: "bg",
    label: "Background",
    prefix: "bg-",
    custom: true,
    hint: "The fill behind the element.",
    doc: "background-color",
  },
  {
    id: "text",
    label: "Text color",
    prefix: "text-",
    hint: "The colour of the text inside.",
    doc: "text-color",
  },
  {
    id: "border-color",
    label: "Border color",
    prefix: "border-",
    custom: true,
    hint: "Colour of the outline (needs a border width to show).",
    doc: "border-color",
  },
];

type SpaceTarget = {
  id: string;
  label: string;
  prefix: string;
  hint: string;
  doc: string;
};
// CSS properties measured in the spacing scale. All take a theme step or an arbitrary length.
const SPACE_TARGETS: SpaceTarget[] = [
  {
    id: "p",
    label: "Padding",
    prefix: "p-",
    hint: "Inner breathing room on all sides.",
    doc: "padding",
  },
  {
    id: "px",
    label: "Padding X",
    prefix: "px-",
    hint: "Inner room left and right.",
    doc: "padding",
  },
  {
    id: "py",
    label: "Padding Y",
    prefix: "py-",
    hint: "Inner room top and bottom.",
    doc: "padding",
  },
  {
    id: "gap",
    label: "Spacing between",
    prefix: "gap-",
    hint: "The gap between stacked children.",
    doc: "gap",
  },
  {
    id: "mt",
    label: "Margin top",
    prefix: "mt-",
    hint: "Outer space above the element.",
    doc: "margin",
  },
  {
    id: "mb",
    label: "Margin bottom",
    prefix: "mb-",
    hint: "Outer space below the element.",
    doc: "margin",
  },
];

type ScaleProp = {
  id: string;
  label: string;
  prefix: string;
  scale: ScaleKind;
  group: Group;
  custom?: CustomKind;
  hint: string;
  example?: string;
  doc: string;
};
// Single-target properties bound to one theme namespace.
const SCALE_PROPS: ScaleProp[] = [
  {
    id: "radius",
    label: "Corners",
    prefix: "rounded-",
    scale: "radius",
    group: "Border",
    custom: "length",
    hint: "How rounded the corners are.",
    example: "Full makes a pill or a circle.",
    doc: "border-radius",
  },
  {
    id: "size",
    label: "Text size",
    prefix: "text-",
    scale: "size",
    group: "Type",
    custom: "length",
    hint: "How large the text is.",
    doc: "font-size",
  },
  {
    id: "font",
    label: "Font",
    prefix: "font-",
    scale: "font",
    group: "Type",
    hint: "Which typeface the text uses.",
    doc: "font-family",
  },
  {
    id: "shadow",
    label: "Shadow",
    prefix: "shadow-",
    scale: "shadow",
    group: "Effects",
    hint: "A soft drop shadow that lifts the element off the page.",
    doc: "box-shadow",
  },
];

type EnumProp = {
  id: string;
  label: string;
  prefix: string;
  group: Group;
  options: [string, string][];
  hint: string;
  example?: string;
  doc: string;
};
// Properties with a built-in Tailwind scale (no theme namespace).
const ENUM_PROPS: EnumProp[] = [
  {
    id: "weight",
    label: "Weight",
    prefix: "font-",
    group: "Type",
    options: [
      ["normal", "Normal"],
      ["medium", "Medium"],
      ["semibold", "Semibold"],
      ["bold", "Bold"],
    ],
    hint: "How thick or bold the text is.",
    doc: "font-weight",
  },
  {
    id: "tracking",
    label: "Letter spacing",
    prefix: "tracking-",
    group: "Type",
    options: [
      ["tight", "Tight"],
      ["normal", "Normal"],
      ["wide", "Wide"],
      ["wider", "Wider"],
    ],
    hint: "Space between letters; Wide suits eyebrows/small caps.",
    doc: "letter-spacing",
  },
  {
    id: "leading",
    label: "Line height",
    prefix: "leading-",
    group: "Type",
    options: [
      ["tight", "Tight"],
      ["snug", "Snug"],
      ["normal", "Normal"],
      ["relaxed", "Relaxed"],
      ["loose", "Loose"],
    ],
    hint: "Vertical space between lines of text.",
    doc: "line-height",
  },
  {
    id: "align",
    label: "Text align",
    prefix: "text-",
    group: "Type",
    options: [
      ["left", "Left"],
      ["center", "Center"],
      ["right", "Right"],
    ],
    hint: "How the text lines up horizontally.",
    doc: "text-align",
  },
  {
    id: "opacity",
    label: "Opacity",
    prefix: "opacity-",
    group: "Effects",
    options: [
      ["100", "100%"],
      ["75", "75%"],
      ["50", "50%"],
      ["25", "25%"],
    ],
    hint: "How see-through the element is.",
    doc: "opacity",
  },
  {
    id: "transition",
    label: "Transition",
    prefix: "transition-",
    group: "Motion",
    options: [
      ["none", "None"],
      ["colors", "Colors"],
      ["all", "All"],
    ],
    hint: "Animate changes smoothly — pair with a Hover style so it eases instead of snapping.",
    example: "Colors + a Hover background = a smooth fade on hover.",
    doc: "transition-property",
  },
  {
    id: "duration",
    label: "Duration",
    prefix: "duration-",
    group: "Motion",
    options: [
      ["150", "150ms"],
      ["200", "200ms"],
      ["300", "300ms"],
      ["500", "500ms"],
    ],
    hint: "How long the transition takes.",
    doc: "transition-duration",
  },
];

// Order matters only for the shared `text-` seam: colour, then size, then align — each disambiguated
// by validating the value against its own option set, so `text-ink`/`text-lg`/`text-center` resolve
// to the right facet.
export const FACETS: Facet[] = [
  ...COLOR_TARGETS.map(
    (t): Facet => ({
      id: t.id,
      label: t.label,
      prefix: t.prefix,
      group: "Color",
      render: "swatch",
      scale: "color",
      custom: t.custom ? "color" : undefined,
      hint: t.hint,
      doc: DOC + t.doc,
    }),
  ),
  ...SPACE_TARGETS.map(
    (t): Facet => ({
      id: t.id,
      label: t.label,
      prefix: t.prefix,
      group: "Spacing",
      render: "steps",
      scale: "space",
      custom: "length",
      hint: t.hint,
      doc: DOC + t.doc,
    }),
  ),
  ...SCALE_PROPS.map(
    (p): Facet => ({
      id: p.id,
      label: p.label,
      prefix: p.prefix,
      group: p.group,
      render: "steps",
      scale: p.scale,
      custom: p.custom,
      hint: p.hint,
      example: p.example,
      doc: DOC + p.doc,
    }),
  ),
  ...ENUM_PROPS.map(
    (p): Facet => ({
      id: p.id,
      label: p.label,
      prefix: p.prefix,
      group: p.group,
      render: "steps",
      fixed: fixed(...p.options),
      hint: p.hint,
      example: p.example,
      doc: DOC + p.doc,
    }),
  ),
];

export const FACET_BY_ID = new Map(FACETS.map((f) => [f.id, f]));

export function optionsOf(facet: Facet, scales: Scales): Option[] {
  return facet.fixed ?? (facet.scale ? scales[facet.scale] : []);
}

export const isCustomValue = (key: string) => key.startsWith("[") && key.endsWith("]");
export const customInner = (key: string) =>
  isCustomValue(key) ? key.slice(1, -1) : "";

/** Split a class into its variant chain (`md:hover:`) and the bare utility. The arbitrary values we
// emit (`[#e0512f]`, `[13px]`) never contain a colon, so the last colon is the variant boundary. */
function splitVariant(cls: string): { variant: string; util: string } {
  const i = cls.lastIndexOf(":");
  return i === -1
    ? { variant: "", util: cls }
    : { variant: cls.slice(0, i + 1), util: cls.slice(i + 1) };
}

/** Resolve a facet for a bare utility — by preset value, or by an allowed arbitrary `[…]` value. */
function facetOf(
  util: string,
  scales: Scales,
): { facet: Facet; key: string } | undefined {
  for (const facet of FACETS) {
    if (!util.startsWith(facet.prefix)) continue;
    const key = util.slice(facet.prefix.length);
    if (facet.custom && isCustomValue(key)) return { facet, key };
    if (optionsOf(facet, scales).some((o) => o.key === key)) return { facet, key };
  }
  return undefined;
}

export interface ParsedClasses {
  /** facet id → current option key (or `[…]` arbitrary), for the active variant only. */
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
// resizing a box. For preview we flatten the active mode's variants onto the base cascade. It must
// be facet-aware: same-property utilities resolve by *stylesheet* order, not class order, so an
// appended `bg-paper` won't beat a base `bg-surface` unless the base utility is dropped first.
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
