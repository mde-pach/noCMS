import * as v from "valibot";
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

export type CTAProps = v.InferInput<typeof CTASchema>;

// A closing call-to-action. `banner` fills the band; `boxed` insets the message in
// a bordered card on a plain page background. Static.
export function CTA({
  title = SEED.title,
  body = SEED.body,
  primaryLabel = SEED.primaryLabel,
  primaryHref = "#",
  secondaryLabel,
  secondaryHref = "#",
  layout = "banner",
  background = "brand",
}: CTAProps) {
  const inner = (
    <div style={{ textAlign: "center", display: "grid", gap: "var(--space-md)" }}>
      {title ? (
        <h2 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>{title}</h2>
      ) : null}
      {body ? (
        <p style={{ margin: "0 auto", maxWidth: "38rem", color: mutedInk }}>{body}</p>
      ) : null}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-sm)",
          justifyContent: "center",
          marginTop: "var(--space-sm)",
        }}
      >
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
      <Band background="page">
        <Container width="normal">
          <div
            style={{
              padding: "var(--space-xl)",
              borderRadius: "var(--radius-md)",
              border: hairline,
              background:
                "color-mix(in srgb, var(--color-brand-500) 7%, var(--color-bg))",
            }}
          >
            {inner}
          </div>
        </Container>
      </Band>
    );
  }

  return (
    <Band background={background}>
      <Container width="normal">{inner}</Container>
    </Band>
  );
}
