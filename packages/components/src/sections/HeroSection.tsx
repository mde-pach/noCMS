import * as v from "valibot";
import { Button } from "../primitives/Button";
import { Container } from "../primitives/Container";
import { Image } from "../primitives/Image";
import {
  Band,
  imageField,
  linkField,
  mutedInk,
  optionalRichText,
  richText,
  type SurfaceRole,
  surfaceField,
} from "./shared";

const SEED = {
  title: "Build a real website on GitHub — for free",
  subtitle:
    "noCMS turns your repo into a CMS. Edit in-site, theme live, publish with one click. Nothing centralized to maintain.",
  primaryLabel: "Get started",
  secondaryLabel: "See how it works",
} as const;

export const HeroSectionSchema = v.object({
  eyebrow: v.optional(v.string()),
  title: v.optional(richText(), SEED.title),
  subtitle: optionalRichText(SEED.subtitle),
  primaryLabel: v.optional(v.string(), SEED.primaryLabel),
  primaryHref: linkField(),
  secondaryLabel: v.optional(v.string(), SEED.secondaryLabel),
  secondaryHref: linkField(),
  image: imageField(),
  imageAlt: v.optional(v.string(), ""),
  layout: v.optional(v.picklist(["center", "left", "split"]), "center"),
  background: surfaceField("page"),
});

export type HeroSectionProps = v.InferInput<typeof HeroSectionSchema>;

// The opening band: a headline, supporting line, and up to two CTAs, optionally
// paired with an image. `center`/`left` set text alignment; `split` floats the
// image beside the copy. Static — no interactivity to hydrate.
export function HeroSection({
  eyebrow,
  title = SEED.title,
  subtitle = SEED.subtitle,
  primaryLabel = SEED.primaryLabel,
  primaryHref = "#",
  secondaryLabel = SEED.secondaryLabel,
  secondaryHref = "#",
  image,
  imageAlt = "",
  layout = "center",
  background = "page",
}: HeroSectionProps) {
  const surface: SurfaceRole = background;
  const centered = layout === "center";
  const copy = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-md)",
        alignItems: centered ? "center" : "flex-start",
        textAlign: centered ? "center" : "left",
        maxWidth: layout === "split" ? "none" : "44rem",
        marginInline: centered ? "auto" : undefined,
      }}
    >
      {eyebrow ? (
        <span style={{ color: "var(--color-brand-600)", fontWeight: 600 }}>
          {eyebrow}
        </span>
      ) : null}
      <h1 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>{title}</h1>
      {subtitle ? (
        <p style={{ margin: 0, color: mutedInk, fontSize: "1.15rem" }}>{subtitle}</p>
      ) : null}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-sm)",
          marginTop: "var(--space-sm)",
          justifyContent: centered ? "center" : "flex-start",
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

  return (
    <Band background={surface} size="lg">
      <Container width="wide">
        {layout === "split" && image ? (
          <div
            class="hero-split"
            style={{
              display: "grid",
              gap: "var(--space-xl)",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
              alignItems: "center",
            }}
          >
            {copy}
            <Image src={image} alt={imageAlt} rounded />
          </div>
        ) : (
          <>
            {copy}
            {image ? (
              <div style={{ marginTop: "var(--space-lg)" }}>
                <Image src={image} alt={imageAlt} rounded />
              </div>
            ) : null}
          </>
        )}
      </Container>
    </Band>
  );
}
