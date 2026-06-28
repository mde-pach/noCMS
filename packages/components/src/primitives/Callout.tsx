import type { ComponentChildren } from "preact";
import * as v from "valibot";
import { cx } from "../cx";

export const CalloutSchema = v.object({
  variant: v.picklist(["info", "warn", "tip"]),
});

export type CalloutProps = v.InferInput<typeof CalloutSchema> & {
  children?: ComponentChildren;
  class?: string;
  className?: string;
};

const BASE = "block p-md rounded-md border-l-[3px] text-text";

// Each variant has an accent the box tints from, so info/tip/warn read at a glance.
const VARIANT = {
  info: "border-l-[#3b6fd4] bg-[#3b6fd4]/9",
  tip: "border-l-brand-500 bg-brand-500/9",
  warn: "border-l-[#c4781f] bg-[#c4781f]/9",
} as const;

export function Callout({ variant, children, class: cls, className }: CalloutProps) {
  return (
    <aside class={cx(BASE, VARIANT[variant], className, cls)} data-variant={variant}>
      {children}
    </aside>
  );
}
