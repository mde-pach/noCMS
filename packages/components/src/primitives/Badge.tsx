import type { ComponentChildren } from "preact";
import * as v from "valibot";

export const BadgeSchema = v.object({
  variant: v.optional(v.picklist(["neutral", "new", "success", "warn"]), "neutral"),
});

export type BadgeProps = v.InferInput<typeof BadgeSchema> & {
  children?: ComponentChildren;
};

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
