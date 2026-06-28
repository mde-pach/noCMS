import type { ComponentChildren } from "preact";
import * as v from "valibot";
import { cx } from "../cx";

// The auto-layout container (D22): one block that arranges its children as a row, a column,
// or a grid — Figma's auto-layout model, not raw CSS. Every prop is a flat scalar so it
// round-trips as a JSX attribute; the editor renders them as one visual layout inspector
// (`direction` → a row/column/grid toggle, `align` → a 2-axis matrix that co-writes
// `justify`). `Stack`/`Grid` stay as their column/grid specialisations.
export const FrameSchema = v.object({
  direction: v.optional(
    v.pipe(
      v.picklist(["row", "column", "grid"]),
      v.metadata({ control: "layout-direction" }),
    ),
    "column",
  ),
  columns: v.optional(
    v.pipe(
      v.number(),
      v.minValue(1),
      v.maxValue(6),
      v.metadata({ control: "range", showIf: { key: "direction", equals: "grid" } }),
    ),
    3,
  ),
  gap: v.optional(v.picklist(["sm", "md", "lg"]), "md"),
  padding: v.optional(v.picklist(["none", "sm", "md", "lg"]), "none"),
  align: v.optional(
    v.pipe(
      v.picklist(["start", "center", "end"]),
      // The matrix sets both axes at once; it reads `direction` to know which axis is
      // the main one and writes its sibling `justify` through this `config.mainKey`.
      v.metadata({ control: "layout-align", config: { mainKey: "justify" } }),
    ),
    "start",
  ),
  justify: v.optional(
    v.pipe(v.picklist(["start", "center", "end"]), v.metadata({ control: "hidden" })),
    "start",
  ),
  wrap: v.optional(
    v.pipe(v.boolean(), v.metadata({ showIf: { key: "direction", equals: "row" } })),
    false,
  ),
});

export type FrameProps = v.InferInput<typeof FrameSchema> & {
  children?: ComponentChildren;
  class?: string;
  className?: string;
};

const GAP = { sm: "gap-sm", md: "gap-md", lg: "gap-lg" } as const;
const PAD = { none: "p-0", sm: "p-sm", md: "p-md", lg: "p-lg" } as const;
const ALIGN = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
} as const;
const JUSTIFY = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
} as const;

export function Frame({
  direction = "column",
  columns = 3,
  gap = "md",
  padding = "none",
  align = "start",
  justify = "start",
  wrap = false,
  children,
  class: cls,
  className,
}: FrameProps) {
  if (direction === "grid") {
    return (
      <div
        class={cx(
          "grid",
          `grid-cols-${columns}`,
          GAP[gap],
          PAD[padding],
          className,
          cls,
        )}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      class={cx(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        wrap ? "flex-wrap" : "flex-nowrap",
        GAP[gap],
        PAD[padding],
        JUSTIFY[justify],
        ALIGN[align],
        className,
        cls,
      )}
    >
      {children}
    </div>
  );
}
