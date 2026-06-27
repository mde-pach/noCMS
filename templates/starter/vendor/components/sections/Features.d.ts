import * as v from "valibot";
export declare const FeaturesSchema: v.ObjectSchema<{
    readonly title: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "richtext";
    }>]>, string>;
    readonly subtitle: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "richtext";
    }>]>, string>;
    readonly columns: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 2, undefined>, v.MaxValueAction<number, 4, undefined>, v.MetadataAction<number, {
        readonly control: "range";
    }>]>, 3>;
    readonly items: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        readonly icon: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly title: v.StringSchema<undefined>;
        readonly body: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, undefined>, {
        icon?: string;
        title: string;
        body?: string;
    }[]>;
    readonly background: v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<readonly ["page", "surface", "subtle", "brand"], undefined>, v.MetadataAction<"page" | "surface" | "subtle" | "brand", {
        readonly control: "color";
    }>]>, "page" | "surface" | "subtle" | "brand">;
}, undefined>;
export type FeaturesProps = v.InferInput<typeof FeaturesSchema>;
export declare function Features({ title, subtitle, columns, items, background, }: FeaturesProps): import("preact").JSX.Element;
