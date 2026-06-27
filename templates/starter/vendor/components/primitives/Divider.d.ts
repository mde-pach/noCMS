import * as v from "valibot";
export declare const DividerSchema: v.ObjectSchema<{
    readonly spacing: v.OptionalSchema<v.PicklistSchema<["sm", "md", "lg"], undefined>, "md">;
}, undefined>;
export type DividerProps = v.InferInput<typeof DividerSchema>;
export declare function Divider({ spacing }: DividerProps): import("preact").JSX.Element;
