import * as v from "valibot";
import { Container } from "../primitives/Container";
import { Grid } from "../primitives/Grid";
import { Band, mutedInk, optionalRichText, surfaceField } from "./shared";

const Stat = v.object({
  value: v.string(),
  label: v.string(),
});

const SEED_STATS: v.InferInput<typeof Stat>[] = [
  { value: "$0", label: "Monthly cost" },
  { value: "100%", label: "Yours to own" },
  { value: "1-click", label: "To publish" },
];

export const StatsSchema = v.object({
  title: optionalRichText(),
  stats: v.optional(v.array(Stat), SEED_STATS),
  background: surfaceField("brand"),
});

export type StatsProps = v.InferInput<typeof StatsSchema>;

// A row of big-number stats. Defaults to the `brand` band so the figures pop.
// Static.
export function Stats({ title, stats = SEED_STATS, background = "brand" }: StatsProps) {
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
        <Grid columns={stats.length} gap="md">
          {stats.map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.75rem", fontWeight: 700, lineHeight: 1.1 }}>
                {stat.value}
              </div>
              <div style={{ marginTop: "var(--space-sm)", color: mutedInk }}>
                {stat.label}
              </div>
            </div>
          ))}
        </Grid>
      </Container>
    </Band>
  );
}
