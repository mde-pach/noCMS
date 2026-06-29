import * as v from "valibot";
export declare const NavLink: v.ObjectSchema<{
    readonly label: v.StringSchema<undefined>;
    readonly href: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "url";
    }>]>;
}, undefined>;
export declare const SEED_LINKS: v.InferInput<typeof NavLink>[];
export declare const FeatureItem: v.ObjectSchema<{
    readonly icon: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly title: v.StringSchema<undefined>;
    readonly body: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
export declare const SEED_ITEMS: v.InferInput<typeof FeatureItem>[];
export declare const FooterLink: v.ObjectSchema<{
    readonly label: v.StringSchema<undefined>;
    readonly href: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "url";
    }>]>;
}, undefined>;
export declare const FooterColumn: v.ObjectSchema<{
    readonly heading: v.StringSchema<undefined>;
    readonly links: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        readonly label: v.StringSchema<undefined>;
        readonly href: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
            readonly control: "url";
        }>]>;
    }, undefined>, undefined>, undefined>;
}, undefined>;
export declare const SEED_COLUMNS: v.InferInput<typeof FooterColumn>[];
export declare const Quote: v.ObjectSchema<{
    readonly quote: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "richtext";
    }>]>;
    readonly name: v.StringSchema<undefined>;
    readonly role: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly avatar: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "image";
    }>]>, undefined>;
}, undefined>;
export declare const SEED_QUOTES: v.InferInput<typeof Quote>[];
export declare const Tier: v.ObjectSchema<{
    readonly name: v.StringSchema<undefined>;
    readonly price: v.StringSchema<undefined>;
    readonly period: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly features: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    readonly ctaLabel: v.OptionalSchema<v.StringSchema<undefined>, "Choose plan">;
    readonly ctaHref: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "url";
    }>]>, string>;
    readonly highlighted: v.OptionalSchema<v.BooleanSchema<undefined>, false>;
}, undefined>;
export declare const SEED_TIERS: v.InferInput<typeof Tier>[];
export declare const Stat: v.ObjectSchema<{
    readonly value: v.StringSchema<undefined>;
    readonly label: v.StringSchema<undefined>;
}, undefined>;
export declare const SEED_STATS: v.InferInput<typeof Stat>[];
export declare const SEED_HERO: {
    readonly title: "Build a real website on GitHub — for free";
    readonly subtitle: "noCMS turns your repo into a CMS. Edit in-site, theme live, publish with one click. Nothing centralized to maintain.";
    readonly primaryLabel: "Get started";
    readonly secondaryLabel: "See how it works";
};
export declare const SEED_CTA: {
    readonly title: "Ready to own your website?";
    readonly body: "Fork the starter, sign in, and start editing. It's free and it stays yours.";
    readonly primaryLabel: "Fork the starter";
};
