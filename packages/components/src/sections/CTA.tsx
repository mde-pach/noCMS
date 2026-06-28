import * as v from "valibot";
import { cx } from "../cx";
import { Button } from "../primitives/Button";
import { Container } from "../primitives/Container";
import {
  Band,
  hairline,
  linkField,
  mutedInk,
  optionalRichText,
  richText,
  surfaceField,
} from "./shared";

const SEED = {
  title: "Ready to own your website?",
  body: "Fork the starter, sign in, and start editing. It's free and it stays yours.",
  primaryLabel: "Fork the starter",
} as const;

export const CTASchema = v.object({
  title: v.optional(richText(), SEED.title),
  body: optionalRichText(SEED.body),
  primaryLabel: v.optional(v.string(), SEED.primaryLabel),
  primaryHref: linkField(),
  secondaryLabel: v.optional(v.string()),
  secondaryHref: linkField(),
  layout: v.optional(v.picklist(["banner", "boxed"]), "banner"),
  background: surfaceField("brand"),
});

export type CTAProps = v.InferInput<typeof CTASchema> & {
  class?: string;
  className?: string;
};

export function CTA({
  title = SEED.title,
  body = SEED.body,
  primaryLabel = SEED.primaryLabel,
  primaryHref = "#",
  secondaryLabel,
  secondaryHref = "#",
  layout = "banner",
  background = "brand",
  class: cls,
  className,
}: CTAProps) {
  const inner = (
    <div class="text-center grid gap-md">
      {title ? <h2 class="m-0 font-heading">{title}</h2> : null}
      {body ? <p class={cx("mx-auto my-0 max-w-[38rem]", mutedInk)}>{body}</p> : null}
      <div class="flex flex-wrap gap-sm justify-center mt-sm">
        {primaryLabel ? (
          <Button label={primaryLabel} href={primaryHref} variant="primary" />
        ) : null}
        {secondaryLabel ? (
          <Button label={secondaryLabel} href={secondaryHref} variant="secondary" />
        ) : null}
      </div>
    </div>
  );

  if (layout === "boxed") {
    return (
      <Band background="page" class={cls} className={className}>
        <Container width="normal">
          <div
            class={cx(
              "p-xl rounded-md",
              hairline,
              "bg-[color-mix(in_srgb,var(--color-brand-500)_7%,var(--color-bg))]",
            )}
          >
            {inner}
          </div>
        </Container>
      </Band>
    );
  }

  return (
    <Band background={background} class={cls} className={className}>
      <Container width="normal">{inner}</Container>
    </Band>
  );
}
