import * as v from "valibot";
export declare const DividerSchema: v.ObjectSchema<{
    readonly spacing: v.OptionalSchema<v.PicklistSchema<["sm", "md", "lg"], undefined>, "md">;
}, undefined>;
export type DividerProps = v.InferInput<typeof DividerSchema> & {
    class?: string;
    className?: string;
};
export declare function Divider({ spacing, class: cls, className }: DividerProps): import("preact").JSX.Element;
