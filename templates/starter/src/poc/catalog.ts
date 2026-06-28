import rawCatalog from "virtual:tw-catalog";
import type {
  ColorFamily,
  ColorShade,
  Control,
  Feature,
  FeatureOption,
} from "../../vite-plugin-tw-catalog";
import * as core from "./controls-core";

// The full Tailwind surface, reshaped into CSS *features* with typed controls — never raw class
// names. Coverage is the engine's; the user only ever sees design controls and human values.
export const CATALOG = rawCatalog;
export const COLORS = rawCatalog.colors;
export type { ColorFamily, ColorShade, Control, Feature, FeatureOption };

export const FEATURE = new Map(CATALOG.features.map((f) => [f.id, f]));

const featureOf = core.makeFeatureOf(CATALOG.features);

export { composeColor, parseColorClass, widgetFor } from "./controls-core";
export const featureIdOf = (util: string) => featureOf(util) ?? "";
export const currentClass = (className: string, featureId: string, variant = "") =>
  core.currentClass(className, featureId, variant, featureOf);
export const applyClass = (
  className: string,
  cls: string,
  featureId: string,
  variant = "",
) => core.applyClass(className, cls, featureId, variant, featureOf);

/** The value scale of a feature as composable keys (`p-4` → key "4"), for box/side controls that
 * re-use one scale across many target prefixes. */
export function scaleKeys(
  featureId: string,
): { key: string; label: string; value: string }[] {
  const f = FEATURE.get(featureId);
  if (!f) return [];
  return f.options.map((o) => ({
    key: o.cls.startsWith(f.prefix) ? o.cls.slice(f.prefix.length) : o.cls,
    label: o.label,
    value: o.value,
  }));
}

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

const COLOR_FEATURE: Record<string, string> = {
  "bg-": "background-color",
  "text-": "color",
  "border-": "border-color",
};

export function colorFeatureId(prefix: string): string {
  return COLOR_FEATURE[prefix] ?? "";
}
