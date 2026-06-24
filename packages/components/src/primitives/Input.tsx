export interface InputProps {
  name: string;
  label?: string;
  type?: "text" | "email" | "tel" | "url" | "number" | "password";
  placeholder?: string;
  required?: boolean;
}

const FIELD = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
} as const;

// A labelled single-line form field.
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
