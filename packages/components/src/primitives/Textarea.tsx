import * as v from "valibot";
import { cx } from "../cx";

export const TextareaSchema = v.object({
  name: v.string(),
  label: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  rows: v.optional(v.pipe(v.number(), v.minValue(2), v.maxValue(20)), 4),
  required: v.optional(v.boolean(), false),
});

export type TextareaProps = v.InferInput<typeof TextareaSchema> & {
  class?: string;
  className?: string;
};

const FIELD = "flex flex-col gap-sm";

export function Textarea({
  name,
  label,
  placeholder,
  rows = 4,
  required = false,
  class: cls,
  className,
}: TextareaProps) {
  return (
    <label class={cx(FIELD, className, cls)}>
      {label ? <span>{label}</span> : null}
      <textarea name={name} placeholder={placeholder} rows={rows} required={required} />
    </label>
  );
}
