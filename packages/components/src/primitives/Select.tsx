import * as v from "valibot";
import { cx } from "../cx";

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

const FIELD = "flex flex-col gap-sm";

// Options come from a comma-separated string so they're editable through a plain text control
// (props-discovery has no list control).
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
    <label class={cx(FIELD, className, cls)}>
      {label ? <span>{label}</span> : null}
      <select name={name} required={required}>
        {items.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
