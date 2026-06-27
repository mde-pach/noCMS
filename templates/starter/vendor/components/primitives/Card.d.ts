import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const CardSchema: v.ObjectSchema<{
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly href: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
        readonly control: "url";
    }>]>, undefined>;
}, undefined>;
export type CardProps = v.InferInput<typeof CardSchema> & {
    children?: ComponentChildren;
};
export declare function Card({ title, href, children }: CardProps): import("preact").JSX.Element;
