import * as v from "valibot";
export declare const ButtonSchema: v.ObjectSchema<{
    readonly label: v.StringSchema<undefined>;
    readonly href: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "url";
    }>]>, "#">;
    readonly variant: v.OptionalSchema<v.PicklistSchema<["primary", "secondary"], undefined>, "primary">;
}, undefined>;
export type ButtonProps = v.InferInput<typeof ButtonSchema> & {
    class?: string;
    className?: string;
};
export declare function Button({ label, href, variant, class: cls, className, }: ButtonProps): import("preact").JSX.Element;
