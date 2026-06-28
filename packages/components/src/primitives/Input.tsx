import * as v from "valibot";
import { cx } from "../cx";

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

const FIELD = "flex flex-col gap-sm";

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
    <label class={cx(FIELD, className, cls)}>
      {label ? <span>{label}</span> : null}
      <input name={name} type={type} placeholder={placeholder} required={required} />
    </label>
  );
}
