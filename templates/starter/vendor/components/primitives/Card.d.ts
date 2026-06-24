import type { ComponentChildren } from "preact";
export interface CardProps {
    title?: string;
    href?: string;
    children?: ComponentChildren;
}
export declare function Card({ title, href, children }: CardProps): import("preact").JSX.Element;
