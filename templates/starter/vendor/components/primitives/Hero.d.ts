import type { ComponentChildren } from "preact";
export interface HeroProps {
    title: string;
    subtitle?: string;
    children?: ComponentChildren;
}
export declare function Hero({ title, subtitle, children }: HeroProps): import("preact").JSX.Element;
