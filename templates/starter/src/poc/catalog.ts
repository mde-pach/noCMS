import rawCatalog from "virtual:tw-catalog";
import type { CatalogProperty } from "../../vite-plugin-tw-catalog";

// The full, engine-derived Tailwind surface for this theme. Coverage is whatever the engine can
// generate — we never hand-maintain the list (see vite-plugin-tw-catalog).
export const CATALOG = rawCatalog;

// class → property root, so applying a class can drop whatever else targets the same CSS property.
const rootOfClass = new Map<string, string>();
for (const p of CATALOG.properties) for (const c of p.classes) rootOfClass.set(c, p.id);

export const GROUPS = [...new Set(CATALOG.properties.map((p) => p.group))].sort();

interface Entry {
  cls: string;
  label: string;
  group: string;
  root: string;
}
const INDEX: Entry[] = CATALOG.properties.flatMap((p) =>
  p.classes.map((cls) => ({ cls, label: p.label, group: p.group, root: p.id })),
);

export interface SearchHit extends Entry {}

/** Match a query against class name or property label; the whole surface is searchable. */
export function search(query: string, group: string | null, limit = 80): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q && !group) return [];
  const out: SearchHit[] = [];
  for (const e of INDEX) {
    if (group && e.group !== group) continue;
    if (q && !e.cls.includes(q) && !e.label.toLowerCase().includes(q)) continue;
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

export function groupCounts(): { group: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of CATALOG.properties)
    counts.set(p.group, (counts.get(p.group) ?? 0) + p.classes.length);
  return [...counts]
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

const splitVariant = (cls: string) => {
  const i = cls.lastIndexOf(":");
  return i === -1
    ? { variant: "", util: cls }
    : { variant: cls.slice(0, i + 1), util: cls.slice(i + 1) };
};

/** Add `cls` in the active variant, dropping any class that targets the same property (same root). */
export function applyClass(
  className: string,
  cls: string,
  root: string,
  variant = "",
): string {
  const kept = className
    .split(/\s+/)
    .filter(Boolean)
    .filter((c) => {
      const { variant: v, util } = splitVariant(c);
      if (v !== variant) return true;
      return rootOfClass.get(util) !== root;
    });
  kept.push(`${variant}${cls}`);
  return kept.join(" ");
}

export type { CatalogProperty };
