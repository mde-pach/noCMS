import * as v from "valibot";
export declare const FooterSchema: v.ObjectSchema<{
    readonly siteName: v.OptionalSchema<v.StringSchema<undefined>, "noCMS">;
    readonly tagline: v.OptionalSchema<v.StringSchema<undefined>, "Your website, in your repo.">;
    readonly columns: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        readonly heading: v.StringSchema<undefined>;
        readonly links: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
            readonly label: v.StringSchema<undefined>;
            readonly href: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
                readonly control: "url";
            }>]>;
        }, undefined>, undefined>, undefined>;
    }, undefined>, undefined>, {
        heading: string;
        links?: {
            label: string;
            href: string;
        }[];
    }[]>;
    readonly copyright: v.OptionalSchema<v.StringSchema<undefined>, "© noCMS. MIT licensed.">;
    readonly background: v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<readonly ["page", "surface", "subtle", "brand"], undefined>, v.MetadataAction<"page" | "surface" | "subtle" | "brand", {
        readonly control: "color";
    }>]>, "page" | "surface" | "subtle" | "brand">;
}, undefined>;
export type FooterProps = v.InferInput<typeof FooterSchema> & {
    class?: string;
    className?: string;
};
export declare function Footer({ siteName, tagline, columns, copyright, background, class: cls, className, }: FooterProps): import("preact").JSX.Element;
