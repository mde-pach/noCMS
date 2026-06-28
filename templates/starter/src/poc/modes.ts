// The editor edits one mode at a time. A mode = a viewport × an interaction state, which together
// map to a Tailwind variant prefix (`md:hover:`). The user picks "Tablet" / "Hover" — never a prefix.

export type ViewportKey = "base" | "tablet" | "desktop";
export type StateKey = "default" | "hover";

export const VIEWPORTS: {
  key: ViewportKey;
  label: string;
  prefix: string;
  width: number;
}[] = [
  { key: "base", label: "Mobile", prefix: "", width: 380 },
  { key: "tablet", label: "Tablet", prefix: "md:", width: 720 },
  { key: "desktop", label: "Desktop", prefix: "lg:", width: 1040 },
];

export const STATES: { key: StateKey; label: string; prefix: string }[] = [
  { key: "default", label: "Default", prefix: "" },
  { key: "hover", label: "Hover", prefix: "hover:" },
];

const vpPrefix = (vp: ViewportKey) => VIEWPORTS.find((v) => v.key === vp)?.prefix ?? "";
const stPrefix = (st: StateKey) => STATES.find((s) => s.key === st)?.prefix ?? "";

/** The Tailwind variant the active mode writes to. Base+Default = "" (unprefixed). */
export function variantOf(vp: ViewportKey, st: StateKey): string {
  return `${vpPrefix(vp)}${stPrefix(st)}`;
}

export function viewportWidth(vp: ViewportKey): number {
  return VIEWPORTS.find((v) => v.key === vp)?.width ?? 380;
}

/** Variant prefixes to flatten for a live preview of the active mode, in cascade order. */
export function previewOrder(vp: ViewportKey, st: StateKey): string[] {
  const order: string[] = [];
  if (vp === "tablet") order.push("md:");
  if (vp === "desktop") order.push("md:", "lg:");
  if (st === "hover") {
    order.push("hover:");
    if (vp === "tablet") order.push("md:hover:");
    if (vp === "desktop") order.push("md:hover:", "lg:hover:");
  }
  return order;
}
