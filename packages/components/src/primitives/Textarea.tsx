import * as v from "valibot";
import { FieldWrapper } from "./FieldWrapper";

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
    <FieldWrapper label={label} className={className} cls={cls}>
      <textarea name={name} placeholder={placeholder} rows={rows} required={required} />
    </FieldWrapper>
  );
}
