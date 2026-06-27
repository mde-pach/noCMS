import * as v from "valibot";
export declare const SelectSchema: v.ObjectSchema<{
    readonly name: v.StringSchema<undefined>;
    readonly label: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /** Comma-separated option values, e.g. `"Small, Medium, Large"`. */
    readonly options: v.StringSchema<undefined>;
    readonly required: v.OptionalSchema<v.BooleanSchema<undefined>, false>;
}, undefined>;
export type SelectProps = v.InferInput<typeof SelectSchema>;
export declare function Select({ name, label, options, required }: SelectProps): import("preact").JSX.Element;
