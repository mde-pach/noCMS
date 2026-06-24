export interface DividerProps {
  spacing?: "sm" | "md" | "lg";
}

// A horizontal rule with token-driven vertical breathing room.
export function Divider({ spacing = "md" }: DividerProps) {
  return (
    <hr
      class="divider"
      style={{
        border: "none",
        borderTop: "1px solid color-mix(in srgb, var(--color-text) 12%, transparent)",
        marginBlock: `var(--space-${spacing})`,
      }}
    />
  );
}
