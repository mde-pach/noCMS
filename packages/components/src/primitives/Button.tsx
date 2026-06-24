export interface ButtonProps {
  label: string;
  href?: string;
  variant?: "primary" | "secondary";
}

// A link styled as a button — static, so it needs no client hydration.
export function Button({ label, href = "#", variant = "primary" }: ButtonProps) {
  return (
    <a class={`btn btn-${variant}`} href={href}>
      {label}
    </a>
  );
}
