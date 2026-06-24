import type { ComponentChildren } from "preact";
export interface FormProps {
    action: string;
    method?: "get" | "post";
    children?: ComponentChildren;
}
export declare function Form({ action, method, children }: FormProps): import("preact").JSX.Element;
