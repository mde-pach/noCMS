import * as v from "valibot";
export declare const HeroSectionSchema: v.ObjectSchema<{
    readonly eyebrow: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly title: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "richtext";
    }>]>, "Build a real website on GitHub — for free">;
    readonly subtitle: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "richtext";
    }>]>, string>;
    readonly primaryLabel: v.OptionalSchema<v.StringSchema<undefined>, "Get started">;
    readonly primaryHref: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "url";
    }>]>, string>;
    readonly secondaryLabel: v.OptionalSchema<v.StringSchema<undefined>, "See how it works">;
    readonly secondaryHref: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "url";
    }>]>, string>;
    readonly image: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "image";
    }>]>, undefined>;
    readonly imageAlt: v.OptionalSchema<v.StringSchema<undefined>, "">;
    readonly layout: v.OptionalSchema<v.PicklistSchema<["center", "left", "split"], undefined>, "center">;
    readonly background: v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<readonly ["page", "surface", "subtle", "brand"], undefined>, v.MetadataAction<"page" | "surface" | "subtle" | "brand", {
        readonly control: "color";
    }>]>, "page" | "surface" | "subtle" | "brand">;
}, undefined>;
export type HeroSectionProps = v.InferInput<typeof HeroSectionSchema>;
export declare function HeroSection({ eyebrow, title, subtitle, primaryLabel, primaryHref, secondaryLabel, secondaryHref, image, imageAlt, layout, background, }: HeroSectionProps): import("preact").JSX.Element;
