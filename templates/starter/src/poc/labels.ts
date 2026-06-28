// The user sees design-system names, never the raw token key. In the real app these would come
// from token metadata; here a small map stands in so the POC reads like a design tool, not CSS.

const COLOR_LABELS: Record<string, string> = {
  "brand-500": "Brand",
  "brand-600": "Brand dark",
  "accent-500": "Accent",
  ink: "Ink",
  paper: "Paper",
  surface: "Surface",
  muted: "Muted",
};

const STEP_LABELS: Record<string, string> = {
  xs: "XS",
  sm: "S",
  md: "M",
  lg: "L",
  xl: "XL",
  full: "Full",
};

export function optionLabel(scale: string, key: string): string {
  if (scale === "color") return COLOR_LABELS[key] ?? key;
  return STEP_LABELS[key] ?? key;
}
