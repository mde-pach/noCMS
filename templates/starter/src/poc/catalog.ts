import rawCatalog from "virtual:tw-catalog";
import type {
  ColorFamily,
  ColorShade,
  Control,
  Feature,
  FeatureOption,
} from "../../vite-plugin-tw-catalog";

// The full Tailwind surface, reshaped into CSS *features* with typed controls — never raw class
// names. Coverage is the engine's; the user only ever sees design controls and human values.
export const CATALOG = rawCatalog;
export const COLORS = rawCatalog.colors;
export type { ColorFamily, ColorShade, Control, Feature, FeatureOption };

// class → feature id (CSS property), so applying one option drops whatever else drives that feature.
const featureOfClass = new Map<string, string>();
for (const f of CATALOG.features)
  for (const o of f.options) featureOfClass.set(o.cls, f.id);

// Colour utilities carry an opacity modifier (`bg-brand-600/40`) the base map doesn't know — strip
// it so a modified colour still resolves to its feature for highlighting and dedupe.
const stripModifier = (util: string) => util.split("/")[0] ?? util;
const featureOf = (util: string) =>
  featureOfClass.get(util) ?? featureOfClass.get(stripModifier(util));

export function groupCounts(): { group: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const f of CATALOG.features) counts.set(f.group, (counts.get(f.group) ?? 0) + 1);
  return [...counts]
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

/** Find features by their human label (e.g. "border", "rotate", "shadow") — not by class name. */
export function searchFeatures(
  query: string,
  group: string | null,
  limit = 24,
): Feature[] {
  const q = query.trim().toLowerCase();
  if (!q && !group) return [];
  const out: Feature[] = [];
  for (const f of CATALOG.features) {
    if (group && f.group !== group) continue;
    if (q && !f.label.toLowerCase().includes(q) && !f.id.includes(q)) continue;
    out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

const splitVariant = (cls: string) => {
  const i = cls.lastIndexOf(":");
  return i === -1
    ? { variant: "", util: cls }
    : { variant: cls.slice(0, i + 1), util: cls.slice(i + 1) };
};

/** The class currently driving `featureId` on `className`, in the active variant (for highlighting). */
export function currentClass(
  className: string,
  featureId: string,
  variant = "",
): string | undefined {
  for (const cls of className.split(/\s+/).filter(Boolean)) {
    const { variant: v, util } = splitVariant(cls);
    if (v === variant && featureOf(util) === featureId) return util;
  }
  return undefined;
}

const COLOR_FEATURE: Record<string, string> = {
  "bg-": "background-color",
  "text-": "color",
  "border-": "border-color",
};

export function colorFeatureId(prefix: string): string {
  return COLOR_FEATURE[prefix] ?? "";
}

/** Split an applied colour class (`bg-brand-600/40`) back into its knob values. */
export function parseColorClass(
  util: string | undefined,
  prefix: string,
): { key: string; opacity: number } | undefined {
  if (!util || !util.startsWith(prefix)) return undefined;
  const [base, mod] = util.slice(prefix.length).split("/");
  return { key: base ?? "", opacity: mod ? Number(mod) : 100 };
}

/** Compose a colour class from the knobs: family/shade key + opacity. */
export function composeColor(prefix: string, key: string, opacity: number): string {
  return `${prefix}${key}${opacity < 100 ? `/${opacity}` : ""}`;
}

/** Set or clear one feature in the active variant (empty `cls` clears it); other classes untouched. */
export function applyClass(
  className: string,
  cls: string,
  featureId: string,
  variant = "",
): string {
  const kept = className
    .split(/\s+/)
    .filter(Boolean)
    .filter((c) => {
      const { variant: v, util } = splitVariant(c);
      if (v !== variant) return true;
      return featureOf(util) !== featureId;
    });
  if (cls) kept.push(`${variant}${cls}`);
  return kept.join(" ");
}
