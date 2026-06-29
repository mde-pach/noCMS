import * as v from "valibot";
import { cx } from "../cx";
import { Container } from "../primitives/Container";
import { Grid } from "../primitives/Grid";
import { Image } from "../primitives/Image";
import { Quote, SEED_QUOTES } from "./seeds";
import { Band, hairline, mutedInk, optionalRichText, surfaceField } from "./shared";

export const TestimonialsSchema = v.object({
  title: optionalRichText("Loved by people who hate maintenance"),
  quotes: v.optional(v.array(Quote), SEED_QUOTES),
  background: surfaceField("surface"),
});

export type TestimonialsProps = v.InferInput<typeof TestimonialsSchema> & {
  class?: string;
  className?: string;
};

export function Testimonials({
  title = "Loved by people who hate maintenance",
  quotes = SEED_QUOTES,
  background = "surface",
  class: cls,
  className,
}: TestimonialsProps) {
  return (
    <Band background={background} class={cls} className={className}>
      <Container width="wide">
        {title ? <h2 class="m-0 mb-lg text-center font-heading">{title}</h2> : null}
        <Grid columns={quotes.length} gap="md">
          {quotes.map((q) => (
            <figure
              key={q.name}
              class={cx("m-0 flex flex-col gap-md p-lg rounded-md bg-bg", hairline)}
            >
              <blockquote class="m-0 text-[1.1rem]">"{q.quote}"</blockquote>
              <figcaption class="flex items-center gap-sm">
                {q.avatar ? (
                  <span class="w-10 h-10 flex-none">
                    <Image src={q.avatar} alt={q.name} width={40} height={40} rounded />
                  </span>
                ) : null}
                <span>
                  <strong>{q.name}</strong>
                  {q.role ? (
                    <span class={cx("block text-[0.9rem]", mutedInk)}>{q.role}</span>
                  ) : null}
                </span>
              </figcaption>
            </figure>
          ))}
        </Grid>
      </Container>
    </Band>
  );
}
