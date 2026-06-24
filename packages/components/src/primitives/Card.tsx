import type { ComponentChildren } from "preact";

export interface CardProps {
  title?: string;
  href?: string;
  children?: ComponentChildren;
}

const STYLE = {
  display: "block",
  padding: "var(--space-md)",
  borderRadius: "var(--radius-md)",
  border: "1px solid color-mix(in srgb, var(--color-text) 12%, transparent)",
  color: "inherit",
  textDecoration: "none",
} as const;

// A bordered content block, optionally a link — for grids of features or posts.
export function Card({ title, href, children }: CardProps) {
  const inner = (
    <>
      {title ? (
        <h3 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>{title}</h3>
      ) : null}
      {children}
    </>
  );
  return href ? (
    <a class="card" href={href} style={STYLE}>
      {inner}
    </a>
  ) : (
    <div class="card" style={STYLE}>
      {inner}
    </div>
  );
}
