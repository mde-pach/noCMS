import type { ComponentChildren } from "preact";
import * as v from "valibot";

// `children` is a slot declared on the registry entry, not a prop control, so it's absent here.
export const StackSchema = v.object({
  gap: v.optional(v.picklist(["sm", "md", "lg"]), "md"),
  align: v.optional(v.picklist(["start", "center", "end", "stretch"]), "stretch"),
});

export type StackProps = v.InferInput<typeof StackSchema> & {
  children?: ComponentChildren;
};

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
