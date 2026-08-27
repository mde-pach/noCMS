import type { ReactNode } from "react";

const VARIANTS = {
  primary: "nc-btn nc-btn-primary",
  ghost: "nc-btn nc-btn-ghost",
} as const;

export default function Button({
  variant = "primary",
  href,
  children,
}: {
  variant?: keyof typeof VARIANTS;
  href?: string;
  children?: ReactNode;
}) {
  const className = VARIANTS[variant] ?? VARIANTS.primary;
  return href ? (
    <a className={className} href={href}>
      {children}
    </a>
  ) : (
    <button className={className} type="button">
      {children}
    </button>
  );
}
