import * as v from "valibot";

export const InputSchema = v.object({
  name: v.string(),
  label: v.optional(v.string()),
  type: v.optional(
    v.picklist(["text", "email", "tel", "url", "number", "password"]),
    "text",
  ),
  placeholder: v.optional(v.string()),
  required: v.optional(v.boolean(), false),
});

export type InputProps = v.InferInput<typeof InputSchema>;

const FIELD = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
} as const;

export function Input({
  name,
  label,
  type = "text",
  placeholder,
  required = false,
}: InputProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is the nested input.
    <label class="field" style={FIELD}>
      {label ? <span class="field-label">{label}</span> : null}
      <input
        class="field-input"
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}
