import * as v from "valibot";
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

export type FeaturesProps = v.InferInput<typeof FeaturesSchema>;

// A grid of feature cards. The card count and column span are both editable; each
// card carries an optional glyph, a heading, and a line of copy. Static.
export function Features({
  title = "Everything you need, nothing you don't",
  subtitle,
  columns = 3,
  items = SEED_ITEMS,
  background = "page",
}: FeaturesProps) {
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
        <Grid columns={columns} gap="md">
          {items.map((item) => (
            <Card key={item.title}>
              {item.icon ? (
                <div
                  aria-hidden="true"
                  style={{
                    fontSize: "1.6rem",
                    color: "var(--color-brand-500)",
                    marginBottom: "var(--space-sm)",
                  }}
                >
                  {item.icon}
                </div>
              ) : null}
              <h3
                style={{
                  margin: "0 0 var(--space-sm)",
                  fontFamily: "var(--font-heading)",
                }}
              >
                {item.title}
              </h3>
              {item.body ? (
                <p style={{ margin: 0, color: mutedInk }}>{item.body}</p>
              ) : null}
            </Card>
          ))}
        </Grid>
      </Container>
    </Band>
  );
}
