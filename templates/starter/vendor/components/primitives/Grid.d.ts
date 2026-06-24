import type { ComponentChildren } from "preact";
export interface GridProps {
    columns?: number;
    gap?: "sm" | "md" | "lg";
    children?: ComponentChildren;
}
export declare function Grid({ columns, gap, children }: GridProps): import("preact").JSX.Element;
