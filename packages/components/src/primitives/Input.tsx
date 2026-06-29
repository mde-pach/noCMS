import * as v from "valibot";
import { FieldWrapper } from "./FieldWrapper";

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

export type InputProps = v.InferInput<typeof InputSchema> & {
  class?: string;
  className?: string;
};

export function Input({
  name,
  label,
  type = "text",
  placeholder,
  required = false,
  class: cls,
  className,
}: InputProps) {
  return (
    <FieldWrapper label={label} className={className} cls={cls}>
      <input name={name} type={type} placeholder={placeholder} required={required} />
    </FieldWrapper>
  );
}
