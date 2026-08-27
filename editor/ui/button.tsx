import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "default" | "primary" | "ghost" | "danger";
type Size = "sm" | "md";

/** Variants are classes over tokens, the shadcn shape — no CSS-in-JS, no theme object. */
export function Button({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`ed-btn ed-btn--${variant} ed-btn--${size} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
