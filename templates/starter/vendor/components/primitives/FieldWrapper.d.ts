import type { ComponentChildren } from "preact";
interface FieldWrapperProps {
    label?: string;
    className?: string;
    cls?: string;
    children?: ComponentChildren;
}
export declare function FieldWrapper({ label, className, cls, children }: FieldWrapperProps): import("preact").JSX.Element;
export {};
