import * as v from "valibot";
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

export type TestimonialsProps = v.InferInput<typeof TestimonialsSchema>;

export function Testimonials({
  title = "Loved by people who hate maintenance",
  quotes = SEED_QUOTES,
  background = "surface",
}: TestimonialsProps) {
  return (
    <Band background={background}>
      <Container width="wide">
        {title ? (
          <h2
            style={{
              margin: "0 0 var(--space-lg)",
              textAlign: "center",
              fontFamily: "var(--font-heading)",
            }}
          >
            {title}
          </h2>
        ) : null}
        <Grid columns={quotes.length} gap="md">
          {quotes.map((q) => (
            <figure
              key={q.name}
              style={{
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-md)",
                padding: "var(--space-lg)",
                borderRadius: "var(--radius-md)",
                border: hairline,
                background: "var(--color-bg)",
              }}
            >
              <blockquote style={{ margin: 0, fontSize: "1.1rem" }}>
                "{q.quote}"
              </blockquote>
              <figcaption
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                }}
              >
                {q.avatar ? (
                  <span style={{ width: "2.5rem", height: "2.5rem", flex: "0 0 auto" }}>
                    <Image src={q.avatar} alt={q.name} width={40} height={40} rounded />
                  </span>
                ) : null}
                <span>
                  <strong>{q.name}</strong>
                  {q.role ? (
                    <span
                      style={{ display: "block", color: mutedInk, fontSize: "0.9rem" }}
                    >
                      {q.role}
                    </span>
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
