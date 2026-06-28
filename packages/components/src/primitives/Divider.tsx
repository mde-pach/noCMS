import * as v from "valibot";
import { cx } from "../cx";

export const DividerSchema = v.object({
  spacing: v.optional(v.picklist(["sm", "md", "lg"]), "md"),
});

export type DividerProps = v.InferInput<typeof DividerSchema> & {
  class?: string;
  className?: string;
};

const BASE = "border-t border-t-text/12";

const SPACING = { sm: "my-sm", md: "my-md", lg: "my-lg" } as const;

export function Divider({ spacing = "md", class: cls, className }: DividerProps) {
  return <hr class={cx(BASE, SPACING[spacing], className, cls)} />;
}
