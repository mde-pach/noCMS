import type { ComponentChildren } from "preact";

export interface CalloutProps {
  variant: "info" | "warn" | "tip";
  children?: ComponentChildren;
}

export function Callout({ variant, children }: CalloutProps) {
  return (
    <aside class={`callout callout-${variant}`} data-variant={variant}>
      {children}
    </aside>
  );
}
