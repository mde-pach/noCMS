import * as v from "valibot";
import { FieldWrapper } from "./FieldWrapper";

export const SelectSchema = v.object({
  name: v.string(),
  label: v.optional(v.string()),
  /** Comma-separated option values, e.g. `"Small, Medium, Large"`. */
  options: v.string(),
  required: v.optional(v.boolean(), false),
});

export type SelectProps = v.InferInput<typeof SelectSchema> & {
  class?: string;
  className?: string;
};

// Options come from a comma-separated string so they're editable through a plain text control.
export function Select({
  name,
  label,
  options,
  required = false,
  class: cls,
  className,
}: SelectProps) {
  const items = options
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean);
  return (
    <FieldWrapper label={label} className={className} cls={cls}>
      <select name={name} required={required}>
        {items.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
