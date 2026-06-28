import type { ComponentChildren } from "preact";
import * as v from "valibot";
import { cx } from "../cx";

export const HeroSchema = v.object({
  title: v.string(),
  subtitle: v.optional(v.string()),
});

export type HeroProps = v.InferInput<typeof HeroSchema> & {
  children?: ComponentChildren;
  class?: string;
  className?: string;
};

export function Hero({ title, subtitle, children, class: cls, className }: HeroProps) {
  return (
    <section class={cx("py-lg", className, cls)}>
      <h1 class="font-heading">{title}</h1>
      {subtitle ? <p class="opacity-80">{subtitle}</p> : null}
      {children}
    </section>
  );
}
