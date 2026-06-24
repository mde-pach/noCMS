import type { ComponentChildren } from "preact";

export interface StackProps {
  gap?: "sm" | "md" | "lg";
  align?: "start" | "center" | "end" | "stretch";
  children?: ComponentChildren;
}

// Stacks children vertically with a consistent gap — the common column layout.
export function Stack({ gap = "md", align = "stretch", children }: StackProps) {
  return (
    <div
      class="stack"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `var(--space-${gap})`,
        alignItems: align,
      }}
    >
      {children}
    </div>
  );
}
