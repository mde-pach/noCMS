import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __unstable__loadDesignSystem } from "@tailwindcss/node";
import type { Plugin } from "vite";

// The complete Tailwind capability surface, derived from the engine — not a hand-written list.
// `getClassList()` enumerates every utility the design system can generate for our `@theme`;
// `parseCandidate()` + `candidatesToCss()` give each class its root and real CSS property, so the
// catalog groups and dedupes by what a class actually *does*. Coverage is the engine's, always.

const here = path.dirname(fileURLToPath(import.meta.url));
const VIRTUAL = "virtual:tw-catalog";

const NS: Record<string, string> = { space: "spacing", text: "text" };
function themeFromTokens(tokensText: string): string {
  const decls = tokensText
    .trim()
    .split("\n")
    .filter((l) => l.includes(": "))
    .map((l) => {
      const [name, val] = l.split(": ");
      const [head, ...rest] = (name ?? "").split(".");
      return `  --${(head && NS[head]) || head}-${rest.join("-")}: ${val};`;
    });
  return decls.join("\n");
}

// Map a CSS property to a user-facing intent bucket. Coarse and finite (by property, not by class),
// and anything unrecognised lands in "Other" — still listed, still usable. Curation never gates.
function bucketOf(cssProp: string): string {
  const p = cssProp;
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
      "justify-content",
      "justify-items",
      "justify-self",
      "align-content",
      "align-items",
      "align-self",
      "place-content",
      "place-items",
      "place-self",
    ].some((x) => p.startsWith(x))
  )
    return "Arrange / layout";
  if (p.startsWith("border") || p.startsWith("outline") || p === "border-radius")
    return "Borders & corners";
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

export interface CatalogProperty {
  id: string;
  label: string;
  cssProp: string;
  group: string;
  kind: string;
  classes: string[];
}
export interface Catalog {
  total: number;
  properties: CatalogProperty[];
}

async function build(tokensText: string): Promise<Catalog> {
  const ds = await __unstable__loadDesignSystem(
    `@import "tailwindcss";\n@theme {\n${themeFromTokens(tokensText)}\n}\n`,
    { base: here },
  );
  const list = ds.getClassList();
  const byRoot = new Map<string, { root: string; kind: string; classes: string[] }>();
  for (const entry of list) {
    const cls = Array.isArray(entry) ? entry[0] : (entry as string);
    if (cls.startsWith("-")) continue; // negatives add noise; skip for the POC
    const parsed = ds.parseCandidate(cls);
    const cand = parsed?.[0];
    if (!cand || !("root" in cand)) continue;
    const root = cand.root as string;
    let g = byRoot.get(root);
    if (!g) {
      g = { root, kind: cand.kind as string, classes: [] };
      byRoot.set(root, g);
    }
    g.classes.push(cls);
  }

  const properties: CatalogProperty[] = [];
  for (const g of byRoot.values()) {
    let cssProp = "";
    try {
      const css = ds.candidatesToCss([g.classes[0] as string])[0] as string | null;
      cssProp = css?.match(/\n\s*(-?[a-z-]+):/)?.[1] ?? "";
    } catch {}
    properties.push({
      id: g.root,
      label: humanize(cssProp || g.root),
      cssProp,
      group: bucketOf(cssProp),
      kind: g.kind,
      classes: g.classes.sort(),
    });
  }
  properties.sort((a, b) => a.label.localeCompare(b.label));
  return { total: list.length, properties };
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
        cache = build(tokens).then((cat) => {
          // biome-ignore lint/suspicious/noConsole: dev-time visibility into catalog size
          console.log(
            `[tw-catalog] ${cat.total} classes → ${cat.properties.length} properties`,
          );
          return `export default ${JSON.stringify(cat)};`;
        });
      }
      return cache;
    },
  };
}
