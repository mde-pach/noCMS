import * as v from "valibot";
export declare const InputSchema: v.ObjectSchema<{
    readonly name: v.StringSchema<undefined>;
    readonly label: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly type: v.OptionalSchema<v.PicklistSchema<["text", "email", "tel", "url", "number", "password"], undefined>, "text">;
    readonly placeholder: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly required: v.OptionalSchema<v.BooleanSchema<undefined>, false>;
}, undefined>;
export type InputProps = v.InferInput<typeof InputSchema> & {
    class?: string;
    className?: string;
};
export declare function Input({ name, label, type, placeholder, required, class: cls, className, }: InputProps): import("preact").JSX.Element;
