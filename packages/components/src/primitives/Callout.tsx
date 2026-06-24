import type { ComponentChildren } from "preact";

export interface CalloutProps {
  variant: "info" | "warn" | "tip";
  children?: ComponentChildren;
}

// Each variant has an accent the box tints from, so info/tip/warn read at a glance.
const ACCENT = {
  info: "#3b6fd4",
  tip: "var(--color-brand-500)",
  warn: "#c4781f",
} as const;

export function Callout({ variant, children }: CalloutProps) {
  const accent = ACCENT[variant];
  return (
    <aside
      class={`callout callout-${variant}`}
      data-variant={variant}
      style={{
        display: "block",
        padding: "var(--space-md)",
        borderRadius: "var(--radius-md)",
        borderLeft: `3px solid ${accent}`,
        background: `color-mix(in srgb, ${accent} 9%, transparent)`,
        color: "var(--color-text)",
      }}
    >
      {children}
    </aside>
  );
}
