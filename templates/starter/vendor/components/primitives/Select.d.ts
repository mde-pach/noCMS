export interface SelectProps {
    name: string;
    label?: string;
    /** Comma-separated option values, e.g. `"Small, Medium, Large"`. */
    options: string;
    required?: boolean;
}
export declare function Select({ name, label, options, required }: SelectProps): import("preact").JSX.Element;
