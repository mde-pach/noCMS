import type { ComponentChildren } from "preact";
import * as v from "valibot";
import { cx } from "../cx";

export const GridSchema = v.object({
  columns: v.optional(
    v.pipe(v.number(), v.minValue(1), v.maxValue(6), v.metadata({ control: "range" })),
    2,
  ),
  gap: v.optional(v.picklist(["sm", "md", "lg"]), "md"),
});

export type GridProps = v.InferInput<typeof GridSchema> & {
  children?: ComponentChildren;
  class?: string;
  className?: string;
};

export function Grid({
  columns = 2,
  gap = "md",
  children,
  class: cls,
  className,
}: GridProps) {
  return (
    <div class={cx("grid", `grid-cols-${columns}`, `gap-${gap}`, className, cls)}>
      {children}
    </div>
  );
}
