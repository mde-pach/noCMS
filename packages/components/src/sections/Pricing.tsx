import * as v from "valibot";
import { cx } from "../cx";
import { Button } from "../primitives/Button";
import { Container } from "../primitives/Container";
import { Grid } from "../primitives/Grid";
import { Band, hairline, mutedInk, optionalRichText, surfaceField } from "./shared";

const Tier = v.object({
  name: v.string(),
  price: v.string(),
  period: v.optional(v.string()),
  features: v.optional(v.array(v.string())),
  ctaLabel: v.optional(v.string(), "Choose plan"),
  ctaHref: v.optional(v.pipe(v.string(), v.metadata({ control: "url" })), "#"),
  highlighted: v.optional(v.boolean(), false),
});

const SEED_TIERS: v.InferInput<typeof Tier>[] = [
  {
    name: "Hobby",
    price: "Free",
    period: "forever",
    features: ["1 site", "Community support", "GitHub Pages hosting"],
    ctaLabel: "Start free",
  },
  {
    name: "Pro",
    price: "$0",
    period: "still free",
    features: ["Unlimited sites", "Custom domain", "Live theming", "Priority docs"],
    ctaLabel: "Fork the starter",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$0",
    period: "open source",
    features: ["Everything in Pro", "Self-host the relay", "Plugin sandbox"],
    ctaLabel: "Read the guide",
  },
];

export const PricingSchema = v.object({
  title: optionalRichText("Free, because there's nothing to bill for"),
  subtitle: optionalRichText("You host on your own GitHub. We don't run your infra."),
  tiers: v.optional(v.array(Tier), SEED_TIERS),
  background: surfaceField("subtle"),
});

export type PricingProps = v.InferInput<typeof PricingSchema> & {
  class?: string;
  className?: string;
};

export function Pricing({
  title = "Free, because there's nothing to bill for",
  subtitle = "You host on your own GitHub. We don't run your infra.",
  tiers = SEED_TIERS,
  background = "subtle",
  class: cls,
  className,
}: PricingProps) {
  return (
    <Band background={background} class={cls} className={className}>
      <Container width="wide">
        <div class="mb-lg text-center">
          {title ? <h2 class="m-0 font-heading">{title}</h2> : null}
          {subtitle ? (
            <p class={cx("mt-sm mb-0 mx-auto max-w-[40rem]", mutedInk)}>{subtitle}</p>
          ) : null}
        </div>
        <Grid columns={tiers.length} gap="md">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              class={cx(
                "flex flex-col gap-md p-lg rounded-md bg-bg",
                tier.highlighted
                  ? "border border-brand-500 shadow-[0_1px_0_var(--color-brand-500),0_12px_30px_-18px_var(--color-brand-500)]"
                  : hairline,
              )}
            >
              <div>
                <h3 class="m-0 font-heading">{tier.name}</h3>
                <div class="mt-sm">
                  <span class="text-[2rem] font-bold">{tier.price}</span>
                  {tier.period ? <span class={mutedInk}> / {tier.period}</span> : null}
                </div>
              </div>
              {tier.features?.length ? (
                <ul class="list-none m-0 p-0 flex flex-col gap-sm">
                  {tier.features.map((feature) => (
                    <li key={feature} class="flex gap-[0.5em]">
                      <span aria-hidden="true" class="text-brand-500">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div class="mt-auto">
                <Button
                  label={tier.ctaLabel ?? "Choose plan"}
                  href={tier.ctaHref ?? "#"}
                  variant={tier.highlighted ? "primary" : "secondary"}
                />
              </div>
            </div>
          ))}
        </Grid>
      </Container>
    </Band>
  );
}
