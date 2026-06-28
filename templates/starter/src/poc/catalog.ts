import rawCatalog from "virtual:tw-catalog";
import type { Control, Feature, FeatureOption } from "../../vite-plugin-tw-catalog";

// The full Tailwind surface, reshaped into CSS *features* with typed controls — never raw class
// names. Coverage is the engine's; the user only ever sees design controls and human values.
export const CATALOG = rawCatalog;
export type { Control, Feature, FeatureOption };

// class → feature id (CSS property), so applying one option drops whatever else drives that feature.
const featureOfClass = new Map<string, string>();
for (const f of CATALOG.features)
  for (const o of f.options) featureOfClass.set(o.cls, f.id);

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
    if (v === variant && featureOfClass.get(util) === featureId) return util;
  }
  return undefined;
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
      return featureOfClass.get(util) !== featureId;
    });
  if (cls) kept.push(`${variant}${cls}`);
  return kept.join(" ");
}
