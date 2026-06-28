import * as v from "valibot";
export declare const CTASchema: v.ObjectSchema<{
    readonly title: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "richtext";
    }>]>, "Ready to own your website?">;
    readonly body: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "richtext";
    }>]>, string>;
    readonly primaryLabel: v.OptionalSchema<v.StringSchema<undefined>, "Fork the starter">;
    readonly primaryHref: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "url";
    }>]>, string>;
    readonly secondaryLabel: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly secondaryHref: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "url";
    }>]>, string>;
    readonly layout: v.OptionalSchema<v.PicklistSchema<["banner", "boxed"], undefined>, "banner">;
    readonly background: v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<readonly ["page", "surface", "subtle", "brand"], undefined>, v.MetadataAction<"page" | "surface" | "subtle" | "brand", {
        readonly control: "color";
    }>]>, "page" | "surface" | "subtle" | "brand">;
}, undefined>;
export type CTAProps = v.InferInput<typeof CTASchema> & {
    class?: string;
    className?: string;
};
export declare function CTA({ title, body, primaryLabel, primaryHref, secondaryLabel, secondaryHref, layout, background, class: cls, className, }: CTAProps): import("preact").JSX.Element;
