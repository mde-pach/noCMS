import type { ComponentChildren } from "preact";
import * as v from "valibot";

export const ContainerSchema = v.object({
  width: v.optional(v.picklist(["narrow", "normal", "wide", "full"]), "normal"),
});

export type ContainerProps = v.InferInput<typeof ContainerSchema> & {
  children?: ComponentChildren;
};

const MAX_WIDTH = {
  narrow: "40rem",
  normal: "60rem",
  wide: "80rem",
  full: "100%",
} as const;

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
