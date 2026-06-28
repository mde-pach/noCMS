import type { ComponentChildren } from "preact";
import * as v from "valibot";
import { cx } from "../cx";

export const ContainerSchema = v.object({
  width: v.optional(v.picklist(["narrow", "normal", "wide", "full"]), "normal"),
});

export type ContainerProps = v.InferInput<typeof ContainerSchema> & {
  children?: ComponentChildren;
  class?: string;
  className?: string;
};

const BASE = "mx-auto px-md";

const WIDTH = {
  narrow: "max-w-[40rem]",
  normal: "max-w-[60rem]",
  wide: "max-w-[80rem]",
  full: "max-w-full",
} as const;

export function Container({
  width = "normal",
  children,
  class: cls,
  className,
}: ContainerProps) {
  return <div class={cx(BASE, WIDTH[width], className, cls)}>{children}</div>;
}
