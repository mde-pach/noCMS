import * as v from "valibot";
import { cx } from "../cx";
import { Container } from "../primitives/Container";
import { Grid } from "../primitives/Grid";
import { Image } from "../primitives/Image";
import { Band, hairline, mutedInk, optionalRichText, surfaceField } from "./shared";

const Quote = v.object({
  quote: v.pipe(v.string(), v.metadata({ control: "richtext" })),
  name: v.string(),
  role: v.optional(v.string()),
  avatar: v.optional(v.pipe(v.string(), v.metadata({ control: "image" }))),
});

const SEED_QUOTES: v.InferInput<typeof Quote>[] = [
  {
    quote: "I shipped my portfolio in an afternoon and I own every byte of it.",
    name: "Ada L.",
    role: "Designer",
  },
  {
    quote:
      "No dashboard to log into, no bill at the end of the month. It's just my repo.",
    name: "Grace H.",
    role: "Indie dev",
  },
  {
    quote: "Editing in-site and seeing the exact published result is the whole game.",
    name: "Linus T.",
    role: "Writer",
  },
];

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
