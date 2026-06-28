import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const SectionSchema: v.ObjectSchema<{
    readonly tone: v.OptionalSchema<v.PicklistSchema<["default", "muted", "accent"], undefined>, "default">;
    readonly padding: v.OptionalSchema<v.PicklistSchema<["sm", "md", "lg"], undefined>, "lg">;
}, undefined>;
export type SectionProps = v.InferInput<typeof SectionSchema> & {
    children?: ComponentChildren;
    class?: string;
    className?: string;
};
export declare function Section({ tone, padding, children, class: cls, className, }: SectionProps): import("preact").JSX.Element;
