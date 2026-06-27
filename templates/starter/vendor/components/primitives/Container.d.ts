import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const ContainerSchema: v.ObjectSchema<{
    readonly width: v.OptionalSchema<v.PicklistSchema<["narrow", "normal", "wide", "full"], undefined>, "normal">;
}, undefined>;
export type ContainerProps = v.InferInput<typeof ContainerSchema> & {
    children?: ComponentChildren;
};
export declare function Container({ width, children }: ContainerProps): import("preact").JSX.Element;
