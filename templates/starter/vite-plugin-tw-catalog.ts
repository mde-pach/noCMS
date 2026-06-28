import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __unstable__loadDesignSystem } from "@tailwindcss/node";
import type { Plugin } from "vite";

// noCMS controls and Tailwind utilities are the *same controls at two levels*: Tailwind speaks a
// naming convention (`border-b-gray-950`), noCMS speaks UI (a Border control with side, width,
// colour). So the catalog's unit is a CSS *feature* presented as a typed control — never a class
// name. We still get complete coverage from the engine, but reshaped into design controls:
// `getClassList()` → every class; `candidatesToCss()` → its real CSS property + value; group by
// property; infer the control from the values; label by the value, not the utility.

const here = path.dirname(fileURLToPath(import.meta.url));
const VIRTUAL = "virtual:tw-catalog";

const NS: Record<string, string> = { space: "spacing", text: "text" };
function themeFromTokens(tokensText: string): string {
  return tokensText
    .trim()
    .split("\n")
    .filter((l) => l.includes(": "))
    .map((l) => {
      const [name, val] = l.split(": ");
      const [head, ...rest] = (name ?? "").split(".");
      return `  --${(head && NS[head]) || head}-${rest.join("-")}: ${val};`;
    })
    .join("\n");
}

function bucketOf(p: string): string {
  if (
    /color$/.test(p) ||
    p === "fill" ||
    p === "stroke" ||
    p.startsWith("background-image") ||
    p.includes("gradient")
  )
    return "Color & fill";
  if (
    p.startsWith("font") ||
    p.startsWith("text-") ||
    [
      "letter-spacing",
      "line-height",
      "text-align",
      "text-transform",
      "text-decoration",
      "white-space",
      "word-break",
      "list-style-type",
      "vertical-align",
    ].includes(p)
  )
    return "Text & type";
  if (
    ["padding", "margin", "gap", "row-gap", "column-gap"].some((x) => p.startsWith(x))
  )
    return "Size & spacing";
  if (
    [
      "width",
      "height",
      "min-width",
      "max-width",
      "min-height",
      "max-height",
      "inline-size",
      "block-size",
    ].includes(p)
  )
    return "Size & spacing";
  if (
    [
      "display",
      "position",
      "top",
      "right",
      "bottom",
      "left",
      "inset",
      "float",
      "clear",
      "z-index",
      "overflow",
      "flex",
      "order",
      "grid",
      "justify",
      "align",
      "place",
    ].some((x) => p.startsWith(x))
  )
    return "Arrange / layout";
  if (p.startsWith("border") || p.startsWith("outline")) return "Borders & corners";
  if (
    [
      "box-shadow",
      "opacity",
      "filter",
      "backdrop-filter",
      "mix-blend-mode",
      "background-blend-mode",
      "mask",
      "text-shadow",
    ].some((x) => p.startsWith(x))
  )
    return "Shadow & effects";
  if (p.startsWith("transition") || p.startsWith("animation")) return "Motion";
  if (
    ["transform", "rotate", "scale", "translate", "skew", "perspective"].some((x) =>
      p.startsWith(x),
    )
  )
    return "Transform";
  if (
    [
      "cursor",
      "user-select",
      "pointer-events",
      "scroll",
      "resize",
      "appearance",
      "touch-action",
      "accent-color",
      "caret-color",
      "will-change",
    ].some((x) => p.startsWith(x))
  )
    return "Behavior";
  return "Other";
}

const humanize = (s: string) =>
  s ? s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()) : "";

export type Control = "color" | "length" | "angle" | "number" | "enum";

const isColor = (v: string) =>
  /^#|^rgb|^hsl|^oklch|^oklab|^color\(|^var\(--color|^currentcolor|^transparent$/i.test(
    v.trim(),
  );
const isAngle = (v: string) => /^-?[\d.]+(deg|turn|grad|rad)$/.test(v.trim());
const isLength = (v: string) =>
  /^-?[\d.]+(px|rem|em|%|vh|vw|vmin|vmax|ch|pt)$/.test(v.trim()) ||
  v.trim() === "0" ||
  /^calc\(/.test(v.trim());
const isNumber = (v: string) => /^-?[\d.]+$/.test(v.trim());

// Global/keyword values (none, auto, inherit…) are valid options but shouldn't decide the control
// type — classify by the meaningful values so one stray `rotate: none` doesn't demote an angle.
const GLOBAL = new Set([
  "none",
  "auto",
  "inherit",
  "initial",
  "unset",
  "revert",
  "normal",
]);

function inferControl(values: string[]): Control {
  if (values.some(isColor)) return "color";
  const meaningful = values.filter((v) => v && !GLOBAL.has(v.trim()));
  if (!meaningful.length) return "enum";
  if (meaningful.every(isAngle)) return "angle";
  if (meaningful.every((v) => isLength(v) || isNumber(v)) && meaningful.some(isLength))
    return "length";
  if (meaningful.every(isNumber)) return "number";
  return "enum";
}

// Each value is labelled by its own type — and token-scale values resolve to a clean step name
// (`var(--spacing-xl)` → "XL", `calc(var(--spacing) * 4)` → "4") instead of the raw CSS.
function valueLabel(value: string): string {
  const v = value.trim();
  if (isAngle(v)) return v.replace(/deg$/, "°");
  const calc = v.match(/calc\(\s*var\(--spacing\)\s*\*\s*(-?[\d.]+)\s*\)/);
  if (calc?.[1]) return calc[1];
  const tok = v.match(/^var\(--[a-z]+-([a-z0-9-]+)\)$/);
  if (tok?.[1]) return /^\d/.test(tok[1]) ? tok[1] : tok[1].toUpperCase();
  if (isColor(v) || isLength(v) || isNumber(v)) return v;
  return humanize(v);
}

// The property a class is "about": the first real (non-`--*`) declaration with a *concrete* value.
// Tailwind writes scaffolding first (`border-2` → `border-style: var(--tw-border-style)` then the
// real `border-width: 2px`), so a `var(--tw-*)` value is skipped — unless every declaration is one
// (shadow/filter genuinely resolve to `var(--tw-shadow)`), in which case we keep the first.
function primaryDecl(css: string): { prop: string; value: string } | undefined {
  // Only the utility's own rule body — never the trailing `@property { syntax: … }` blocks, whose
  // `syntax`/`inherits` declarations would otherwise be mistaken for the property.
  const body = css.match(/\{([^{}]*)\}/)?.[1] ?? css;
  const re = /([a-z-]+)\s*:\s*([^;{}]+);/g;
  const vendor = (p: string) => /^-(webkit|moz|ms|o)-/.test(p);
  let m: RegExpExecArray | null;
  let first: { prop: string; value: string } | undefined;
  while ((m = re.exec(body))) {
    const prop = m[1] ?? "";
    if (prop.startsWith("--")) continue;
    const value = (m[2] ?? "").trim();
    first ??= { prop, value };
    // Prefer the real, standard property: skip `var(--tw-*)` scaffolding and `-webkit-`/`-moz-`
    // prefixes (`select-none` writes `-webkit-user-select` before the real `user-select`).
    if (!value.startsWith("var(--tw-") && !vendor(prop)) return { prop, value };
  }
  return first;
}

export interface FeatureOption {
  cls: string;
  value: string;
  label: string;
  /** Numeric magnitude for ordering a scale by *size* (xs<sm<md<lg<xl), resolved from the token —
   * named values compile to `var(--spacing-md)`, which a leading-number sort can't order. */
  order: number;
}

// biome-ignore lint/suspicious/noExplicitAny: the design system is an unstable, untyped API
function orderOf(value: string, ds: any): number {
  const v = value.trim();
  const calc = v.match(/calc\(\s*var\(--spacing\)\s*\*\s*(-?[\d.]+)\s*\)/);
  if (calc?.[1]) return Number(calc[1]);
  const tok = v.match(/^var\((--[a-z0-9-]+)\)$/);
  if (tok) {
    try {
      const n = Number.parseFloat(ds.resolveThemeValue(tok[1]) as string);
      if (!Number.isNaN(n)) return n;
    } catch {}
  }
  const n = Number.parseFloat(v);
  return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n;
}
export interface Feature {
  id: string;
  label: string;
  group: string;
  control: Control;
  /** The utility prefix (`bg-`, `rotate-`) — drives the arbitrary-value escape `prefix-[value]`;
   * empty for static/keyword utilities that take no value. */
  prefix: string;
  /** Every class that drives this property (no value-dedupe) — the basis for class→feature lookup,
   * so distinct utilities that share a value (`text-x` vs `placeholder-x`) are both resolvable. */
  classes: string[];
  options: FeatureOption[];
}
export interface ColorShade {
  shade: string | null;
  value: string;
  cls: string;
}
export interface ColorFamily {
  name: string;
  isToken: boolean;
  shades: ColorShade[];
}
export interface Catalog {
  total: number;
  features: Feature[];
  colors: ColorFamily[];
}

// The colour *dimension*: every `bg-*` colour decomposed into family + shade, reusable by every
// colour property (background, text, border). Two knobs (family, shade) + opacity generate the
// whole `bg-blue-500`/`bg-brand-600/40` space — the generator, not a list of classes.
// In v4 every colour compiles to `var(--color-…)`, so swatch previews resolve the var to its real
// value, and "our" colours are detected by family name (from the token file), not by the var shape.
// biome-ignore lint/suspicious/noExplicitAny: the design system is an unstable, untyped API
function deriveColors(
  bgOptions: FeatureOption[],
  ds: any,
  tokenFamilies: Set<string>,
): ColorFamily[] {
  const resolve = (v: string): string => {
    const m = v.match(/var\((--[^,)]+)/);
    if (!m) return v;
    try {
      return (ds.resolveThemeValue(m[1]) as string) ?? v;
    } catch {
      return v;
    }
  };
  const fam = new Map<string, ColorFamily>();
  for (const o of bgOptions) {
    const key = o.cls.replace(/^bg-/, "");
    const m = key.match(/^(.*)-(\d+)$/);
    const base = m ? (m[1] as string) : key;
    const shade = m ? (m[2] as string) : null;
    let f = fam.get(base);
    if (!f) {
      f = { name: base, isToken: tokenFamilies.has(base), shades: [] };
      fam.set(base, f);
    }
    f.shades.push({ shade, value: resolve(o.value), cls: o.cls });
  }
  const families = [...fam.values()];
  for (const f of families)
    f.shades.sort((a, b) => Number(a.shade ?? 0) - Number(b.shade ?? 0));
  families.sort((a, b) =>
    a.isToken === b.isToken ? a.name.localeCompare(b.name) : a.isToken ? -1 : 1,
  );
  return families;
}

export async function buildCatalog(
  tokensText: string,
  base: string = here,
): Promise<Catalog> {
  const ds = await __unstable__loadDesignSystem(
    `@import "tailwindcss";\n@theme {\n${themeFromTokens(tokensText)}\n}\n`,
    { base },
  );
  const classes = ds
    .getClassList()
    .map((e: unknown) => (Array.isArray(e) ? (e[0] as string) : (e as string)))
    .filter((c) => !c.startsWith("-"));
  const cssList = ds.candidatesToCss(classes) as (string | null)[];

  const byProp = new Map<
    string,
    { prop: string; opts: { cls: string; value: string }[] }
  >();
  for (let i = 0; i < classes.length; i++) {
    const css = cssList[i];
    if (!css) continue;
    const decl = primaryDecl(css);
    if (!decl || !decl.value) continue;
    let f = byProp.get(decl.prop);
    if (!f) {
      f = { prop: decl.prop, opts: [] };
      byProp.set(decl.prop, f);
    }
    f.opts.push({ cls: classes[i] as string, value: decl.value });
  }

  const features: Feature[] = [];
  for (const f of byProp.values()) {
    const control = inferControl(f.opts.map((o) => o.value));
    // Drop near-duplicate values (e.g. a token and a palette entry resolving alike) for tidiness.
    const seen = new Set<string>();
    const options: FeatureOption[] = [];
    for (const o of f.opts) {
      if (seen.has(o.value)) continue;
      seen.add(o.value);
      options.push({
        cls: o.cls,
        value: o.value,
        label: valueLabel(o.value),
        order: orderOf(o.value, ds),
      });
    }
    const cand = ds.parseCandidate(f.opts[0]?.cls ?? "")?.[0];
    const prefix = cand && cand.kind === "functional" ? `${cand.root}-` : "";
    features.push({
      id: f.prop,
      label: humanize(f.prop),
      group: bucketOf(f.prop),
      control,
      prefix,
      classes: f.opts.map((o) => o.cls),
      options,
    });
  }
  features.sort((a, b) => a.label.localeCompare(b.label));
  const tokenFamilies = new Set(
    tokensText
      .split("\n")
      .filter((l) => l.startsWith("color."))
      .map((l) => (l.split(":")[0] ?? "").split(".")[1] ?? "")
      .filter(Boolean),
  );
  const bg = features.find((f) => f.id === "background-color");
  const colors = bg ? deriveColors(bg.options, ds, tokenFamilies) : [];
  return { total: classes.length, features, colors };
}

export function twCatalogPlugin(): Plugin {
  let cache: Promise<string> | undefined;
  return {
    name: "nocms-tw-catalog",
    resolveId(id) {
      if (id === VIRTUAL) return `\0${VIRTUAL}`;
    },
    load(id) {
      if (id !== `\0${VIRTUAL}`) return;
      if (!cache) {
        const tokens = readFileSync(path.resolve(here, "poc.tokens"), "utf8");
        cache = buildCatalog(tokens).then((cat) => {
          // biome-ignore lint/suspicious/noConsole: dev-time visibility into catalog size
          console.log(
            `[tw-catalog] ${cat.total} classes → ${cat.features.length} features`,
          );
          return `export default ${JSON.stringify(cat)};`;
        });
      }
      return cache;
    },
  };
}
