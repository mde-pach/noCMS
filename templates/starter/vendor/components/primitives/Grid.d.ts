import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const GridSchema: v.ObjectSchema<{
    readonly columns: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 1, undefined>, v.MaxValueAction<number, 6, undefined>, v.MetadataAction<number, {
        readonly control: "range";
    }>]>, 2>;
    readonly gap: v.OptionalSchema<v.PicklistSchema<["sm", "md", "lg"], undefined>, "md">;
}, undefined>;
export type GridProps = v.InferInput<typeof GridSchema> & {
    children?: ComponentChildren;
    class?: string;
    className?: string;
};
export declare function Grid({ columns, gap, children, class: cls, className, }: GridProps): import("preact").JSX.Element;
