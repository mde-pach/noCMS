import * as v from "valibot";
export declare const StatsSchema: v.ObjectSchema<{
    readonly title: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "richtext";
    }>]>, string>;
    readonly stats: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        readonly value: v.StringSchema<undefined>;
        readonly label: v.StringSchema<undefined>;
    }, undefined>, undefined>, {
        value: string;
        label: string;
    }[]>;
    readonly background: v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<readonly ["page", "surface", "subtle", "brand"], undefined>, v.MetadataAction<"page" | "surface" | "subtle" | "brand", {
        readonly control: "color";
    }>]>, "page" | "surface" | "subtle" | "brand">;
}, undefined>;
export type StatsProps = v.InferInput<typeof StatsSchema> & {
    class?: string;
    className?: string;
};
export declare function Stats({ title, stats, background, class: cls, className, }: StatsProps): import("preact").JSX.Element;
