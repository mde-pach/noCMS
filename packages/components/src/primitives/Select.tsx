import * as v from "valibot";

export const SelectSchema = v.object({
  name: v.string(),
  label: v.optional(v.string()),
  /** Comma-separated option values, e.g. `"Small, Medium, Large"`. */
  options: v.string(),
  required: v.optional(v.boolean(), false),
});

export type SelectProps = v.InferInput<typeof SelectSchema>;

const FIELD = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
} as const;

// Options come from a comma-separated string so they're editable through a plain text control
// (props-discovery has no list control).
export function Select({ name, label, options, required = false }: SelectProps) {
  const items = options
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean);
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is the nested select.
    <label class="field" style={FIELD}>
      {label ? <span class="field-label">{label}</span> : null}
      <select class="field-input" name={name} required={required}>
        {items.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
