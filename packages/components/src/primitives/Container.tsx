import type { ComponentChildren } from "preact";

export interface ContainerProps {
  width?: "narrow" | "normal" | "wide" | "full";
  children?: ComponentChildren;
}

const MAX_WIDTH = {
  narrow: "40rem",
  normal: "60rem",
  wide: "80rem",
  full: "100%",
} as const;

// Centers and width-constrains its content — the page's horizontal rhythm.
export function Container({ width = "normal", children }: ContainerProps) {
  return (
    <div
      class={`container container-${width}`}
      style={{
        maxWidth: MAX_WIDTH[width],
        marginInline: "auto",
        paddingInline: "var(--space-md)",
      }}
    >
      {children}
    </div>
  );
}
