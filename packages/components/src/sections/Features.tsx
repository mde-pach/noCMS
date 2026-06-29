import * as v from "valibot";
import { cx } from "../cx";
import { Card } from "../primitives/Card";
import { Container } from "../primitives/Container";
import { Grid } from "../primitives/Grid";
import { FeatureItem, SEED_ITEMS } from "./seeds";
import { Band, mutedInk, optionalRichText, surfaceField } from "./shared";

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
