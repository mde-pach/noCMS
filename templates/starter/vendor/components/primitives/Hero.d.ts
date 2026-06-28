import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const HeroSchema: v.ObjectSchema<{
    readonly title: v.StringSchema<undefined>;
    readonly subtitle: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
export type HeroProps = v.InferInput<typeof HeroSchema> & {
    children?: ComponentChildren;
    class?: string;
    className?: string;
};
export declare function Hero({ title, subtitle, children, class: cls, className }: HeroProps): import("preact").JSX.Element;
