import * as v from "valibot";
export declare const ImageSchema: v.ObjectSchema<{
    readonly src: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "image";
    }>]>;
    readonly alt: v.StringSchema<undefined>;
    readonly width: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly height: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly rounded: v.OptionalSchema<v.BooleanSchema<undefined>, false>;
}, undefined>;
export type ImageProps = v.InferInput<typeof ImageSchema> & {
    class?: string;
    className?: string;
};
export declare function Image({ src, alt, width, height, rounded, class: cls, className, }: ImageProps): import("preact").JSX.Element;
