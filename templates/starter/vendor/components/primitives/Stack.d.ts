import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const StackSchema: v.ObjectSchema<{
    readonly gap: v.OptionalSchema<v.PicklistSchema<["sm", "md", "lg"], undefined>, "md">;
    readonly align: v.OptionalSchema<v.PicklistSchema<["start", "center", "end", "stretch"], undefined>, "stretch">;
}, undefined>;
export type StackProps = v.InferInput<typeof StackSchema> & {
    children?: ComponentChildren;
};
export declare function Stack({ gap, align, children }: StackProps): import("preact").JSX.Element;
