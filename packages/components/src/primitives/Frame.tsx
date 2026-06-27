import type { ComponentChildren } from "preact";
import * as v from "valibot";

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
};

const SPACE = {
  none: "0",
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
} as const;
const POSITION = { start: "flex-start", center: "center", end: "flex-end" } as const;

export function Frame({
  direction = "column",
  columns = 3,
  gap = "md",
  padding = "none",
  align = "start",
  justify = "start",
  wrap = false,
  children,
}: FrameProps) {
  const box = { gap: SPACE[gap], padding: SPACE[padding] };
  if (direction === "grid") {
    return (
      <div
        class="frame frame-grid"
        style={{
          ...box,
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      class={`frame frame-${direction}`}
      style={{
        ...box,
        display: "flex",
        flexDirection: direction,
        flexWrap: wrap ? "wrap" : "nowrap",
        justifyContent: POSITION[justify],
        alignItems: POSITION[align],
      }}
    >
      {children}
    </div>
  );
}
