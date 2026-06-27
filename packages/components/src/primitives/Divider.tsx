import * as v from "valibot";

export const DividerSchema = v.object({
  spacing: v.optional(v.picklist(["sm", "md", "lg"]), "md"),
});

export type DividerProps = v.InferInput<typeof DividerSchema>;

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
