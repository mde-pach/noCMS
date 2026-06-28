import * as v from "valibot";
export declare const NavbarSchema: v.ObjectSchema<{
    readonly brand: v.OptionalSchema<v.StringSchema<undefined>, "no">;
    readonly brandMark: v.OptionalSchema<v.StringSchema<undefined>, "CMS">;
    readonly tagline: v.OptionalSchema<v.StringSchema<undefined>, "starter">;
    readonly links: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        readonly label: v.StringSchema<undefined>;
        readonly href: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
            readonly control: "url";
        }>]>;
    }, undefined>, undefined>, {
        label: string;
        href: string;
    }[]>;
    readonly ctaLabel: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly ctaHref: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "url";
    }>]>, string>;
    readonly sticky: v.OptionalSchema<v.BooleanSchema<undefined>, true>;
}, undefined>;
export type NavbarProps = v.InferInput<typeof NavbarSchema> & {
    class?: string;
    className?: string;
};
export declare function Navbar({ brand, brandMark, tagline, links, ctaLabel, ctaHref, sticky, class: cls, className, }: NavbarProps): import("preact").JSX.Element;
