import type { ComponentChildren } from "preact";
export interface StackProps {
    gap?: "sm" | "md" | "lg";
    align?: "start" | "center" | "end" | "stretch";
    children?: ComponentChildren;
}
export declare function Stack({ gap, align, children }: StackProps): import("preact").JSX.Element;
