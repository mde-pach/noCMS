export interface ButtonProps {
  label: string;
  href?: string;
  variant?: "primary" | "secondary";
}

const BASE = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5em",
  padding: "0.7em 1.25em",
  borderRadius: "var(--radius-md)",
  fontFamily: "var(--font-body)",
  fontSize: "0.95rem",
  fontWeight: 600,
  lineHeight: 1.1,
  textDecoration: "none",
  cursor: "pointer",
  transition: "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
} as const;

const VARIANTS = {
  primary: {
    background: "var(--color-brand-500)",
    color: "var(--color-bg)",
    border: "1px solid var(--color-brand-500)",
  },
  secondary: {
    background: "transparent",
    color: "var(--color-text)",
    border: "1px solid color-mix(in srgb, var(--color-text) 22%, transparent)",
  },
} as const;

// A link styled as a button — static, so it needs no client hydration. Hover/focus
// polish is layered by the site theme (styles.css) on the `.btn` class.
export function Button({ label, href = "#", variant = "primary" }: ButtonProps) {
  return (
    <a
      class={`btn btn-${variant}`}
      href={href}
      style={{ ...BASE, ...VARIANTS[variant] }}
    >
      {label}
    </a>
  );
}
