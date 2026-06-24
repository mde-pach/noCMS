import type { ComponentChildren } from "preact";
export interface ContainerProps {
    width?: "narrow" | "normal" | "wide" | "full";
    children?: ComponentChildren;
}
export declare function Container({ width, children }: ContainerProps): import("preact").JSX.Element;
