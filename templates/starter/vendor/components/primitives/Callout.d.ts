import type { ComponentChildren } from "preact";
export interface CalloutProps {
    variant: "info" | "warn" | "tip";
    children?: ComponentChildren;
}
export declare function Callout({ variant, children }: CalloutProps): import("preact").JSX.Element;
