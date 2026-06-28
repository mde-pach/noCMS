// The pure control logic, with no dependency on the built catalog — so it is unit-testable and the
// catalog/engine can be injected. `catalog.ts` binds these to the real engine data; tests build a
// real catalog and inject it too.

export interface FeatureLike {
  control: string;
  prefix: string;
  options: { cls: string; value: string; label: string }[];
}

export type WidgetKind = "color" | "dropdown" | "segmented" | "slider";

/** Which compact widget a feature should use — the single rule every control selection goes through. */
export function widgetFor(f: FeatureLike): WidgetKind {
  if (f.control === "color") return "color";
  if (f.control === "enum") return f.options.length > 5 ? "dropdown" : "segmented";
  return "slider";
}

export function splitVariant(cls: string): { variant: string; util: string } {
  const i = cls.lastIndexOf(":");
  return i === -1
    ? { variant: "", util: cls }
    : { variant: cls.slice(0, i + 1), util: cls.slice(i + 1) };
}

export const stripModifier = (util: string) => util.split("/")[0] ?? util;

/** A colour class (`bg-brand-600/40`) → its knob values. */
export function parseColorClass(
  util: string | undefined,
  prefix: string,
): { key: string; opacity: number } | undefined {
  if (!util || !util.startsWith(prefix)) return undefined;
  const [base, mod] = util.slice(prefix.length).split("/");
  return { key: base ?? "", opacity: mod ? Number(mod) : 100 };
}

/** Knobs (family/shade key + opacity) → a colour class. */
export function composeColor(prefix: string, key: string, opacity: number): string {
  return `${prefix}${key}${opacity < 100 ? `/${opacity}` : ""}`;
}

type FeatureOf = (util: string) => string | undefined;

/** Build the class → feature-id resolver for a catalog (modifier-aware), so the same logic runs in
 * the app and in tests against any catalog. */
export function makeFeatureOf(
  features: { id: string; classes: string[] }[],
): FeatureOf {
  const map = new Map<string, string>();
  for (const f of features) for (const cls of f.classes) map.set(cls, f.id);
  return (util: string) => map.get(util) ?? map.get(stripModifier(util));
}

/** The class currently driving `featureId` on `className`, in the active variant. */
export function currentClass(
  className: string,
  featureId: string,
  variant: string,
  featureOf: FeatureOf,
): string | undefined {
  for (const cls of className.split(/\s+/).filter(Boolean)) {
    const { variant: v, util } = splitVariant(cls);
    if (v === variant && featureOf(util) === featureId) return util;
  }
  return undefined;
}

/** Set or clear one feature in the active variant (empty `cls` clears it); other classes untouched. */
export function applyClass(
  className: string,
  cls: string,
  featureId: string,
  variant: string,
  featureOf: FeatureOf,
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
