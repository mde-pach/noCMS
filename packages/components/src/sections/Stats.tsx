import * as v from "valibot";
import { cx } from "../cx";
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

export type StatsProps = v.InferInput<typeof StatsSchema> & {
  class?: string;
  className?: string;
};

export function Stats({
  title,
  stats = SEED_STATS,
  background = "brand",
  class: cls,
  className,
}: StatsProps) {
  return (
    <Band background={background} class={cls} className={className}>
      <Container width="wide">
        {title ? <h2 class="m-0 mb-lg text-center font-heading">{title}</h2> : null}
        <Grid columns={stats.length} gap="md">
          {stats.map((stat) => (
            <div key={stat.label} class="text-center">
              <div class="text-[2.75rem] font-bold leading-[1.1]">{stat.value}</div>
              <div class={cx("mt-sm", mutedInk)}>{stat.label}</div>
            </div>
          ))}
        </Grid>
      </Container>
    </Band>
  );
}
