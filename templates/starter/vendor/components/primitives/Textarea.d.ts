export interface TextareaProps {
    name: string;
    label?: string;
    placeholder?: string;
    rows?: number;
    required?: boolean;
}
export declare function Textarea({ name, label, placeholder, rows, required, }: TextareaProps): import("preact").JSX.Element;
