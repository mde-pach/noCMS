import type { ComponentChildren } from "preact";
import * as v from "valibot";
import { cx } from "../cx";

export const BadgeSchema = v.object({
  variant: v.optional(v.picklist(["neutral", "new", "success", "warn"]), "neutral"),
});

export type BadgeProps = v.InferInput<typeof BadgeSchema> & {
  children?: ComponentChildren;
  class?: string;
  className?: string;
};

const BASE =
  "inline-block px-[0.5em] py-[0.1em] rounded-md text-[0.85em] leading-[1.4]";

// The canonical inline component the prose widget models as an inline atom
// (`<Badge variant="new">…</Badge>`).
export function Badge({
  variant = "neutral",
  children,
  class: cls,
  className,
}: BadgeProps) {
  return (
    <span class={cx(BASE, className, cls)} data-variant={variant}>
      {children}
    </span>
  );
}
