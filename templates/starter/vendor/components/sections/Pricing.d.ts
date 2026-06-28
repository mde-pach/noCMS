import * as v from "valibot";
export declare const PricingSchema: v.ObjectSchema<{
    readonly title: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "richtext";
    }>]>, string>;
    readonly subtitle: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "richtext";
    }>]>, string>;
    readonly tiers: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        readonly name: v.StringSchema<undefined>;
        readonly price: v.StringSchema<undefined>;
        readonly period: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly features: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        readonly ctaLabel: v.OptionalSchema<v.StringSchema<undefined>, "Choose plan">;
        readonly ctaHref: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
            readonly control: "url";
        }>]>, "#">;
        readonly highlighted: v.OptionalSchema<v.BooleanSchema<undefined>, false>;
    }, undefined>, undefined>, {
        name: string;
        price: string;
        period?: string;
        features?: string[];
        ctaLabel?: string;
        ctaHref?: string;
        highlighted?: boolean;
    }[]>;
    readonly background: v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<readonly ["page", "surface", "subtle", "brand"], undefined>, v.MetadataAction<"page" | "surface" | "subtle" | "brand", {
        readonly control: "color";
    }>]>, "page" | "surface" | "subtle" | "brand">;
}, undefined>;
export type PricingProps = v.InferInput<typeof PricingSchema> & {
    class?: string;
    className?: string;
};
export declare function Pricing({ title, subtitle, tiers, background, class: cls, className, }: PricingProps): import("preact").JSX.Element;
