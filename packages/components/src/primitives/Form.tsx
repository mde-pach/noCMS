import type { ComponentChildren } from "preact";
import * as v from "valibot";

export const FormSchema = v.object({
  action: v.pipe(v.string(), v.metadata({ control: "url" })),
  method: v.optional(v.picklist(["get", "post"]), "post"),
});

export type FormProps = v.InferInput<typeof FormSchema> & {
  children?: ComponentChildren;
};

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
