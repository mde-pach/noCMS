import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const ContainerSchema: v.ObjectSchema<{
    readonly width: v.OptionalSchema<v.PicklistSchema<["narrow", "normal", "wide", "full"], undefined>, "normal">;
}, undefined>;
export type ContainerProps = v.InferInput<typeof ContainerSchema> & {
    children?: ComponentChildren;
    class?: string;
    className?: string;
};
export declare function Container({ width, children, class: cls, className, }: ContainerProps): import("preact").JSX.Element;
