import * as v from "valibot";
export declare const TestimonialsSchema: v.ObjectSchema<{
    readonly title: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "richtext";
    }>]>, string>;
    readonly quotes: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        readonly quote: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
            readonly control: "richtext";
        }>]>;
        readonly name: v.StringSchema<undefined>;
        readonly role: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly avatar: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
            readonly control: "image";
        }>]>, undefined>;
    }, undefined>, undefined>, {
        quote: string;
        name: string;
        role?: string;
        avatar?: string;
    }[]>;
    readonly background: v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<readonly ["page", "surface", "subtle", "brand"], undefined>, v.MetadataAction<"page" | "surface" | "subtle" | "brand", {
        readonly control: "color";
    }>]>, "page" | "surface" | "subtle" | "brand">;
}, undefined>;
export type TestimonialsProps = v.InferInput<typeof TestimonialsSchema>;
export declare function Testimonials({ title, quotes, background, }: TestimonialsProps): import("preact").JSX.Element;
