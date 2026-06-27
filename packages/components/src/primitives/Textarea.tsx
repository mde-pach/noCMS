import * as v from "valibot";

export const TextareaSchema = v.object({
  name: v.string(),
  label: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  rows: v.optional(v.pipe(v.number(), v.minValue(2), v.maxValue(20)), 4),
  required: v.optional(v.boolean(), false),
});

export type TextareaProps = v.InferInput<typeof TextareaSchema>;

const FIELD = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
} as const;

// A labelled multi-line form field.
export function Textarea({
  name,
  label,
  placeholder,
  rows = 4,
  required = false,
}: TextareaProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is the nested textarea.
    <label class="field" style={FIELD}>
      {label ? <span class="field-label">{label}</span> : null}
      <textarea
        class="field-input"
        name={name}
        placeholder={placeholder}
        rows={rows}
        required={required}
      />
    </label>
  );
}
