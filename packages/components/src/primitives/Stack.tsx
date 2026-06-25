import type { ComponentChildren } from "preact";
import * as v from "valibot";

// Props are a valibot schema (D9): `InferInput` gives the type, `deriveControls`
// gives the editor controls — one source, no drift. `children` is a slot (D15),
// declared on the registry entry, not a control here.
export const StackSchema = v.object({
  gap: v.optional(v.picklist(["sm", "md", "lg"]), "md"),
  align: v.optional(v.picklist(["start", "center", "end", "stretch"]), "stretch"),
});

export type StackProps = v.InferInput<typeof StackSchema> & {
  children?: ComponentChildren;
};

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
