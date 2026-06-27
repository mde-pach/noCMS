// A site-local component — the example a fork extends. It lives in the site, not in
// @nocms/components, yet it is insertable, configurable, previewable, and publishable
// exactly like a curated block: it is registered in `src/registry.ts` via the composed
// registry. Its valibot schema is the single source for both prop types and editor
// controls (D9), same as the curated library.

import * as v from "valibot";

export const StatSchema = v.object({
  value: v.string(),
  label: v.string(),
  accent: v.optional(v.boolean(), false),
});

export type StatProps = v.InferInput<typeof StatSchema>;

export function Stat({ value, label, accent = false }: StatProps) {
  return (
    <div style={{ textAlign: "center", padding: "var(--space-md)" }}>
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "2.75rem",
          fontWeight: 700,
          lineHeight: 1,
          color: accent ? "var(--color-brand-500)" : "var(--color-text)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: "0.35rem" }}>
        {label}
      </div>
    </div>
  );
}
