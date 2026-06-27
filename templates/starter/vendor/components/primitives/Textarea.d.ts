import * as v from "valibot";
export declare const TextareaSchema: v.ObjectSchema<{
    readonly name: v.StringSchema<undefined>;
    readonly label: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly placeholder: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly rows: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 2, undefined>, v.MaxValueAction<number, 20, undefined>]>, 4>;
    readonly required: v.OptionalSchema<v.BooleanSchema<undefined>, false>;
}, undefined>;
export type TextareaProps = v.InferInput<typeof TextareaSchema>;
export declare function Textarea({ name, label, placeholder, rows, required, }: TextareaProps): import("preact").JSX.Element;
