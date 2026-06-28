import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const FrameSchema: v.ObjectSchema<{
    readonly direction: v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<["row", "column", "grid"], undefined>, v.MetadataAction<"row" | "column" | "grid", {
        readonly control: "layout-direction";
    }>]>, "column">;
    readonly columns: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 1, undefined>, v.MaxValueAction<number, 6, undefined>, v.MetadataAction<number, {
        readonly control: "range";
        readonly showIf: {
            readonly key: "direction";
            readonly equals: "grid";
        };
    }>]>, 3>;
    readonly gap: v.OptionalSchema<v.PicklistSchema<["sm", "md", "lg"], undefined>, "md">;
    readonly padding: v.OptionalSchema<v.PicklistSchema<["none", "sm", "md", "lg"], undefined>, "none">;
    readonly align: v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<["start", "center", "end"], undefined>, v.MetadataAction<"start" | "center" | "end", {
        readonly control: "layout-align";
        readonly config: {
            readonly mainKey: "justify";
        };
    }>]>, "start">;
    readonly justify: v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<["start", "center", "end"], undefined>, v.MetadataAction<"start" | "center" | "end", {
        readonly control: "hidden";
    }>]>, "start">;
    readonly wrap: v.OptionalSchema<v.SchemaWithPipe<readonly [v.BooleanSchema<undefined>, v.MetadataAction<boolean, {
        readonly showIf: {
            readonly key: "direction";
            readonly equals: "row";
        };
    }>]>, false>;
}, undefined>;
export type FrameProps = v.InferInput<typeof FrameSchema> & {
    children?: ComponentChildren;
    class?: string;
    className?: string;
};
export declare function Frame({ direction, columns, gap, padding, align, justify, wrap, children, class: cls, className, }: FrameProps): import("preact").JSX.Element;
