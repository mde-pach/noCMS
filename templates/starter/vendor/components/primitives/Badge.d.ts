import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const BadgeSchema: v.ObjectSchema<{
    readonly variant: v.OptionalSchema<v.PicklistSchema<["neutral", "new", "success", "warn"], undefined>, "neutral">;
}, undefined>;
export type BadgeProps = v.InferInput<typeof BadgeSchema> & {
    children?: ComponentChildren;
    class?: string;
    className?: string;
};
export declare function Badge({ variant, children, class: cls, className, }: BadgeProps): import("preact").JSX.Element;
