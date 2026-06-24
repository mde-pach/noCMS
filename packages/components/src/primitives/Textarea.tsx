export interface TextareaProps {
  name: string;
  label?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

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
