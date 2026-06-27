import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const BadgeSchema: v.ObjectSchema<{
    readonly variant: v.OptionalSchema<v.PicklistSchema<["neutral", "new", "success", "warn"], undefined>, "neutral">;
}, undefined>;
export type BadgeProps = v.InferInput<typeof BadgeSchema> & {
    children?: ComponentChildren;
};
export declare function Badge({ variant, children }: BadgeProps): import("preact").JSX.Element;
