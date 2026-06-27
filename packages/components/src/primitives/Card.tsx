import type { ComponentChildren } from "preact";
import * as v from "valibot";

export const CardSchema = v.object({
  title: v.optional(v.string()),
  href: v.optional(v.pipe(v.string(), v.metadata({ control: "url" }))),
});

export type CardProps = v.InferInput<typeof CardSchema> & {
  children?: ComponentChildren;
};

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
