import * as core from "./controls-core";
import type { Catalog, ColorFamily, Feature } from "./types";

// A catalog is data (built ahead of time by `build.ts`); these are the runtime operations bound to
// one catalog instance — class↔feature resolution, scale keys, search. Parameterized over the
// catalog so the host injects it (a virtual module in the build, a fixture in tests) and this stays
// pure and environment-free.

export interface CatalogApi {
  CATALOG: Catalog;
  COLORS: ColorFamily[];
  FEATURE: Map<string, Feature>;
  featureIdOf(util: string): string;
  currentClass(
    className: string,
    featureId: string,
    variant?: string,
  ): string | undefined;
  applyClass(
    className: string,
    cls: string,
    featureId: string,
    variant?: string,
  ): string;
  flattenForPreview(className: string, order: string[]): string;
  /** The value scale of a feature as composable keys (`p-4` → key "4"), for box/side controls that
   *  re-use one scale across many target prefixes. */
  scaleKeys(
    featureId: string,
  ): { key: string; label: string; value: string; order: number }[];
  /** Find features by their human label (e.g. "border", "rotate", "shadow") — not by class name. */
  searchFeatures(query: string, group: string | null, limit?: number): Feature[];
  colorFeatureId(prefix: string): string;
}

export function createCatalogApi(catalog: Catalog): CatalogApi {
  const FEATURE = new Map(catalog.features.map((f) => [f.id, f]));
  const featureOf = core.makeFeatureOf(catalog.features);
  // A real colour key (`red-500`, `brand-600`) to probe a target prefix with: `colorFeatureId`
  // resolves `${prefix}${key}` through the same `featureOf` the engine uses, so it returns the
  // colour feature for *any* target the configurator offers (including overloaded `text-`, whose
  // colour feature isn't keyed by a clean `text-` prefix) — never a hand-kept list that drifts.
  const sampleColorKey = ((): string => {
    for (const fam of catalog.colors) {
      const shade = fam.shades.find((s) => s.shade) ?? fam.shades[0];
      if (shade) return shade.shade ? `${fam.name}-${shade.shade}` : fam.name;
    }
    return "red-500";
  })();
  return {
    CATALOG: catalog,
    COLORS: catalog.colors,
    FEATURE,
    featureIdOf: (util) => featureOf(util) ?? "",
    currentClass: (className, featureId, variant = "") =>
      core.currentClass(className, featureId, variant, featureOf),
    applyClass: (className, cls, featureId, variant = "") =>
      core.applyClass(className, cls, featureId, variant, featureOf),
    flattenForPreview: (className, order) =>
      core.flattenForPreview(className, order, featureOf),
    scaleKeys: (featureId) => {
      const f = FEATURE.get(featureId);
      if (!f) return [];
      return f.options.map((o) => ({
        key: o.cls.startsWith(f.prefix) ? o.cls.slice(f.prefix.length) : o.cls,
        label: o.label,
        value: o.value,
        order: o.order,
      }));
    },
    searchFeatures: (query, group, limit = 24) => {
      const q = query.trim().toLowerCase();
      if (!q && !group) return [];
      const out: Feature[] = [];
      for (const f of catalog.features) {
        if (group && f.group !== group) continue;
        if (q && !f.label.toLowerCase().includes(q) && !f.id.includes(q)) continue;
        out.push(f);
        if (out.length >= limit) break;
      }
      return out;
    },
    colorFeatureId: (prefix) => featureOf(`${prefix}${sampleColorKey}`) ?? "",
  };
}
