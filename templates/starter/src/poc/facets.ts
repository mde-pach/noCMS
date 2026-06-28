import { cssVarName, type Token } from "@nocms/tokens";

// A generic Tailwind parser can't read noCMS utilities — `bg-brand-500`/`p-lg` are *custom* theme
// keys no off-the-shelf lib knows (they bake in Tailwind's default theme). But we generate the
// `@theme` from the token file, so we own the vocabulary: scales and facets derive from the same
// tokens that produced the utilities, and editor controls can't drift from what actually exists.

export type ScaleKind = "color" | "space" | "radius" | "font";

export interface ScaleOption {
  key: string;
  /** Live CSS value to preview the option (a `var(--…)`), so swatches track the theme. */
  preview: string;
}

export type Scales = Record<ScaleKind, ScaleOption[]>;

const TOKEN_SCALE: Record<string, ScaleKind> = {
  color: "color",
  space: "space",
  radius: "radius",
  font: "font",
};

export function deriveScales(tokens: Token[]): Scales {
  const scales: Scales = { color: [], space: [], radius: [], font: [] };
  for (const token of tokens) {
    const [head, ...rest] = token.name.split(".");
    const kind = head && TOKEN_SCALE[head];
    if (!kind || rest.length === 0) continue;
    scales[kind].push({
      key: rest.join("-"),
      preview: `var(${cssVarName(token.name)})`,
    });
  }
  return scales;
}

export interface Facet {
  id: string;
  label: string;
  /** The utility prefix, dash included — `bg-`, `px-`, `rounded-`. */
  prefix: string;
  scale: ScaleKind;
  group: "Color" | "Spacing" | "Shape" | "Type";
}

export const FACETS: Facet[] = [
  { id: "bg", label: "Background", prefix: "bg-", scale: "color", group: "Color" },
  { id: "text", label: "Text color", prefix: "text-", scale: "color", group: "Color" },
  { id: "p", label: "Padding", prefix: "p-", scale: "space", group: "Spacing" },
  { id: "px", label: "Padding X", prefix: "px-", scale: "space", group: "Spacing" },
  { id: "py", label: "Padding Y", prefix: "py-", scale: "space", group: "Spacing" },
  { id: "gap", label: "Gap", prefix: "gap-", scale: "space", group: "Spacing" },
  {
    id: "radius",
    label: "Radius",
    prefix: "rounded-",
    scale: "radius",
    group: "Shape",
  },
  { id: "font", label: "Font", prefix: "font-", scale: "font", group: "Type" },
];

const classKey = (cls: string, facet: Facet) =>
  cls.startsWith(facet.prefix) ? cls.slice(facet.prefix.length) : undefined;

/** Resolve a facet for a class only when the remainder is a real key in that facet's scale. */
function facetOf(
  cls: string,
  scales: Scales,
): { facet: Facet; key: string } | undefined {
  for (const facet of FACETS) {
    const key = classKey(cls, facet);
    if (key !== undefined && scales[facet.scale].some((o) => o.key === key)) {
      return { facet, key };
    }
  }
  return undefined;
}

export interface ParsedClasses {
  /** facet id → current scale key. */
  values: Record<string, string>;
  /** Classes we don't model — preserved verbatim on every edit (the escape hatch). */
  passthrough: string[];
}

export function parseClasses(className: string, scales: Scales): ParsedClasses {
  const values: Record<string, string> = {};
  const passthrough: string[] = [];
  for (const cls of className.split(/\s+/).filter(Boolean)) {
    const hit = facetOf(cls, scales);
    if (hit) values[hit.facet.id] = hit.key;
    else passthrough.push(cls);
  }
  return { values, passthrough };
}

/** Set or clear one facet (empty key clears it), leaving every other class untouched. */
export function applyFacet(
  className: string,
  facet: Facet,
  key: string,
  scales: Scales,
): string {
  const kept = className
    .split(/\s+/)
    .filter(Boolean)
    .filter((cls) => facetOf(cls, scales)?.facet.id !== facet.id);
  if (key) kept.push(`${facet.prefix}${key}`);
  return kept.join(" ");
}
