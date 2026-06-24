import type { ComponentChildren } from "preact";

export interface GridProps {
  columns?: number;
  gap?: "sm" | "md" | "lg";
  children?: ComponentChildren;
}

// Lays children into equal-width columns that collapse on narrow viewports.
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
