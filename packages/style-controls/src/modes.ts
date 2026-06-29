// The editor edits one mode at a time. A mode = a viewport × an interaction state, which together
// map to a Tailwind variant prefix (`md:hover:`). The user picks "Tablet" / "Hover" — never a
// prefix. This is the shared variant *dimension*, reused by every configurator.

export type ViewportKey = "base" | "sm" | "md" | "lg" | "xl" | "2xl";
export type StateKey = "default" | "hover" | "focus" | "active" | "disabled";

export const VIEWPORTS: {
  key: ViewportKey;
  label: string;
  prefix: string;
  width: number;
}[] = [
  { key: "base", label: "Base", prefix: "", width: 390 },
  { key: "sm", label: "SM", prefix: "sm:", width: 640 },
  { key: "md", label: "MD", prefix: "md:", width: 768 },
  { key: "lg", label: "LG", prefix: "lg:", width: 1024 },
  { key: "xl", label: "XL", prefix: "xl:", width: 1280 },
  { key: "2xl", label: "2XL", prefix: "2xl:", width: 1536 },
];

export const STATES: { key: StateKey; label: string; prefix: string }[] = [
  { key: "default", label: "Default", prefix: "" },
  { key: "hover", label: "Hover", prefix: "hover:" },
  { key: "focus", label: "Focus", prefix: "focus:" },
  { key: "active", label: "Active", prefix: "active:" },
  { key: "disabled", label: "Disabled", prefix: "disabled:" },
];

const BPS = VIEWPORTS.filter((v) => v.key !== "base");
const vpPrefix = (vp: ViewportKey) => VIEWPORTS.find((v) => v.key === vp)?.prefix ?? "";
const stPrefix = (st: StateKey) => STATES.find((s) => s.key === st)?.prefix ?? "";

/** The Tailwind variant the active mode writes to. Base+Default = "" (unprefixed). */
export function variantOf(vp: ViewportKey, st: StateKey): string {
  return `${vpPrefix(vp)}${stPrefix(st)}`;
}

export function viewportWidth(vp: ViewportKey): number {
  return VIEWPORTS.find((v) => v.key === vp)?.width ?? 390;
}

/** Variant prefixes to flatten for a live preview of the active mode, in cascade order: the
// mobile-first breakpoint chain up to the active one, then the state, then the combined chain. */
export function previewOrder(vp: ViewportKey, st: StateKey): string[] {
  const order: string[] = [];
  const reached =
    vp === "base" ? [] : BPS.slice(0, BPS.findIndex((b) => b.key === vp) + 1);
  for (const b of reached) order.push(b.prefix);
  if (st !== "default") {
    order.push(stPrefix(st));
    for (const b of reached) order.push(`${b.prefix}${stPrefix(st)}`);
  }
  return order;
}
