import * as v from "valibot";
import { cx } from "../cx";

export const ButtonSchema = v.object({
  label: v.string(),
  href: v.optional(v.pipe(v.string(), v.metadata({ control: "url" })), "#"),
  variant: v.optional(v.picklist(["primary", "secondary"]), "primary"),
});

export type ButtonProps = v.InferInput<typeof ButtonSchema> & {
  class?: string;
  className?: string;
};

const BASE =
  "inline-flex items-center gap-[0.5em] px-[1.25em] py-[0.7em] rounded-md font-body text-[0.95rem] font-semibold leading-[1.1] no-underline cursor-pointer transition focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-[3px]";

const VARIANTS = {
  primary:
    "bg-brand-500 text-bg border border-brand-500 hover:-translate-y-px hover:shadow-lg hover:shadow-brand-500/30",
  secondary: "bg-transparent text-text border border-text/22 hover:bg-text/6",
} as const;

// Hover/focus polish rides on Tailwind variants now, so the component is self-contained — the
// trailing `class`/`className` an author (or the editor's Style panel) sets composes on top.
export function Button({
  label,
  href = "#",
  variant = "primary",
  class: cls,
  className,
}: ButtonProps) {
  return (
    <a class={cx(BASE, VARIANTS[variant], className, cls)} href={href}>
      {label}
    </a>
  );
}
