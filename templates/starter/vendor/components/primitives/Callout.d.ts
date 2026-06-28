import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const CalloutSchema: v.ObjectSchema<{
    readonly variant: v.PicklistSchema<["info", "warn", "tip"], undefined>;
}, undefined>;
export type CalloutProps = v.InferInput<typeof CalloutSchema> & {
    children?: ComponentChildren;
    class?: string;
    className?: string;
};
export declare function Callout({ variant, children, class: cls, className }: CalloutProps): import("preact").JSX.Element;
