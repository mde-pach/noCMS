import type { ComponentChildren } from "preact";
import * as v from "valibot";

export const GridSchema = v.object({
  columns: v.optional(
    v.pipe(v.number(), v.minValue(1), v.maxValue(6), v.metadata({ control: "range" })),
    2,
  ),
  gap: v.optional(v.picklist(["sm", "md", "lg"]), "md"),
});

export type GridProps = v.InferInput<typeof GridSchema> & {
  children?: ComponentChildren;
};

export function Grid({ columns = 2, gap = "md", children }: GridProps) {
  return (
    <div
      class="grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `var(--space-${gap})`,
      }}
    >
      {children}
    </div>
  );
}
