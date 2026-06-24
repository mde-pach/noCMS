import type { ComponentChildren } from "preact";

export interface FormProps {
  action: string;
  method?: "get" | "post";
  children?: ComponentChildren;
}

// noCMS sites are static (no server of their own), so a form submits to a
// third-party endpoint given by `action` (e.g. a form-handling service). This
// component renders the markup only — it owns no submission logic.
export function Form({ action, method = "post", children }: FormProps) {
  return (
    <form
      class="form"
      action={action}
      method={method}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
    >
      {children}
    </form>
  );
}
