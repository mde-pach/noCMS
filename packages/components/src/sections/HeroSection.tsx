import * as v from "valibot";
import { cx } from "../cx";
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

export type HeroSectionProps = v.InferInput<typeof HeroSectionSchema> & {
  class?: string;
  className?: string;
};

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
  class: cls,
  className,
}: HeroSectionProps) {
  const surface: SurfaceRole = background;
  const centered = layout === "center";
  const copy = (
    <div
      class={cx(
        "flex flex-col gap-md",
        centered ? "items-center text-center" : "items-start text-left",
        layout === "split" ? "max-w-none" : "max-w-[44rem]",
        centered && "mx-auto",
      )}
    >
      {eyebrow ? <span class="text-brand-600 font-semibold">{eyebrow}</span> : null}
      <h1 class="m-0 font-heading">{title}</h1>
      {subtitle ? <p class={cx("m-0 text-[1.15rem]", mutedInk)}>{subtitle}</p> : null}
      <div
        class={cx(
          "flex flex-wrap gap-sm mt-sm",
          centered ? "justify-center" : "justify-start",
        )}
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
    <Band background={surface} size="lg" class={cls} className={className}>
      <Container width="wide">
        {layout === "split" && image ? (
          <div class="grid gap-xl grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] items-center">
            {copy}
            <Image src={image} alt={imageAlt} rounded />
          </div>
        ) : (
          <>
            {copy}
            {image ? (
              <div class="mt-lg">
                <Image src={image} alt={imageAlt} rounded />
              </div>
            ) : null}
          </>
        )}
      </Container>
    </Band>
  );
}
