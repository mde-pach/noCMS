import * as v from "valibot";
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

export type PricingProps = v.InferInput<typeof PricingSchema>;

export function Pricing({
  title = "Free, because there's nothing to bill for",
  subtitle = "You host on your own GitHub. We don't run your infra.",
  tiers = SEED_TIERS,
  background = "subtle",
}: PricingProps) {
  return (
    <Band background={background}>
      <Container width="wide">
        <div style={{ marginBottom: "var(--space-lg)", textAlign: "center" }}>
          {title ? (
            <h2 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>{title}</h2>
          ) : null}
          {subtitle ? (
            <p
              style={{
                margin: "var(--space-sm) auto 0",
                maxWidth: "40rem",
                color: mutedInk,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        <Grid columns={tiers.length} gap="md">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-md)",
                padding: "var(--space-lg)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg)",
                border: tier.highlighted
                  ? "1px solid var(--color-brand-500)"
                  : hairline,
                boxShadow: tier.highlighted
                  ? "0 1px 0 var(--color-brand-500), 0 12px 30px -18px var(--color-brand-500)"
                  : undefined,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>
                  {tier.name}
                </h3>
                <div style={{ marginTop: "var(--space-sm)" }}>
                  <span style={{ fontSize: "2rem", fontWeight: 700 }}>
                    {tier.price}
                  </span>
                  {tier.period ? (
                    <span style={{ color: mutedInk }}> / {tier.period}</span>
                  ) : null}
                </div>
              </div>
              {tier.features?.length ? (
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-sm)",
                  }}
                >
                  {tier.features.map((feature) => (
                    <li key={feature} style={{ display: "flex", gap: "0.5em" }}>
                      <span
                        aria-hidden="true"
                        style={{ color: "var(--color-brand-500)" }}
                      >
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div style={{ marginTop: "auto" }}>
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
