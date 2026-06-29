import type { ComponentChildren } from "preact";
import { cx } from "../cx";

interface FieldWrapperProps {
  label?: string;
  className?: string;
  cls?: string;
  children?: ComponentChildren;
}

const FIELD = "flex flex-col gap-sm";

// Shared label+layout scaffold for the form primitives. Author class wins via cx precedence.
// Each caller passes its own control as the child, so the label always wraps an input.
export function FieldWrapper({ label, className, cls, children }: FieldWrapperProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the wrapped control is the child each field primitive passes in.
    <label class={cx(FIELD, className, cls)}>
      {label ? <span>{label}</span> : null}
      {children}
    </label>
  );
}
