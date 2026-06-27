import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const FormSchema: v.ObjectSchema<{
    readonly action: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "url";
    }>]>;
    readonly method: v.OptionalSchema<v.PicklistSchema<["get", "post"], undefined>, "post">;
}, undefined>;
export type FormProps = v.InferInput<typeof FormSchema> & {
    children?: ComponentChildren;
};
export declare function Form({ action, method, children }: FormProps): import("preact").JSX.Element;
