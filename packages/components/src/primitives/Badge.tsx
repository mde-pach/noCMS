import type { ComponentChildren } from "preact";

export interface BadgeProps {
  variant?: "neutral" | "new" | "success" | "warn";
  children?: ComponentChildren;
}

// An inline label chip. This is the canonical inline component the prose widget
// models as an inline atom (`<Badge variant="new">…</Badge>`).
export function Badge({ variant = "neutral", children }: BadgeProps) {
  return (
    <span
      class={`badge badge-${variant}`}
      data-variant={variant}
      style={{
        display: "inline-block",
        padding: "0.1em 0.5em",
        borderRadius: "var(--radius-md)",
        fontSize: "0.85em",
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}
