import type { ComponentChildren } from "preact";
import * as v from "valibot";
import { cx } from "../cx";
import { optionalUrl } from "../schema-builders";

export const CardSchema = v.object({
  title: v.optional(v.string()),
  href: optionalUrl(),
});

export type CardProps = v.InferInput<typeof CardSchema> & {
  children?: ComponentChildren;
  class?: string;
  className?: string;
};

const BASE = "block p-md rounded-md border border-text/12 text-inherit no-underline";
const LINK = "transition hover:-translate-y-[3px] hover:shadow-xl hover:shadow-text/12";

export function Card({ title, href, children, class: cls, className }: CardProps) {
  const inner = (
    <>
      {title ? <h3 class="m-0 font-heading">{title}</h3> : null}
      {children}
    </>
  );
  return href ? (
    <a class={cx(BASE, LINK, className, cls)} href={href}>
      {inner}
    </a>
  ) : (
    <div class={cx(BASE, className, cls)}>{inner}</div>
  );
}
