import * as v from "valibot";
import { cx } from "../cx";
import { Card } from "../primitives/Card";
import { Container } from "../primitives/Container";
import { Grid } from "../primitives/Grid";
import { Band, mutedInk, optionalRichText, surfaceField } from "./shared";

const FeatureItem = v.object({
  icon: v.optional(v.string()),
  title: v.string(),
  body: v.optional(v.string()),
});

const SEED_ITEMS: v.InferInput<typeof FeatureItem>[] = [
  {
    icon: "◆",
    title: "The repo is the database",
    body: "Content, history, and drafts live in git. No backend to run, nothing to pay for.",
  },
  {
    icon: "✎",
    title: "Edit in-site, publish on click",
    body: "A WYSIWYG editor ships with every site. Preview is exactly what publishes.",
  },
  {
    icon: "✦",
    title: "Theme without a rebuild",
    body: "Tokens are runtime CSS variables — restyle live, never wait on a build.",
  },
];

export const FeaturesSchema = v.object({
  title: optionalRichText("Everything you need, nothing you don't"),
  subtitle: optionalRichText(),
  columns: v.optional(
    v.pipe(v.number(), v.minValue(2), v.maxValue(4), v.metadata({ control: "range" })),
    3,
  ),
  items: v.optional(v.array(FeatureItem), SEED_ITEMS),
  background: surfaceField("page"),
});

export type FeaturesProps = v.InferInput<typeof FeaturesSchema> & {
  class?: string;
  className?: string;
};

export function Features({
  title = "Everything you need, nothing you don't",
  subtitle,
  columns = 3,
  items = SEED_ITEMS,
  background = "page",
  class: cls,
  className,
}: FeaturesProps) {
  return (
    <Band background={background} class={cls} className={className}>
      <Container width="wide">
        <div class="mb-lg text-center">
          {title ? <h2 class="m-0 font-heading">{title}</h2> : null}
          {subtitle ? (
            <p class={cx("mt-sm mb-0 mx-auto max-w-[40rem]", mutedInk)}>{subtitle}</p>
          ) : null}
        </div>
        <Grid columns={columns} gap="md">
          {items.map((item) => (
            <Card key={item.title}>
              {item.icon ? (
                <div aria-hidden="true" class="text-[1.6rem] text-brand-500 mb-sm">
                  {item.icon}
                </div>
              ) : null}
              <h3 class="m-0 mb-sm font-heading">{item.title}</h3>
              {item.body ? <p class={cx("m-0", mutedInk)}>{item.body}</p> : null}
            </Card>
          ))}
        </Grid>
      </Container>
    </Band>
  );
}
