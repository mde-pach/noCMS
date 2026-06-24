export interface InputProps {
    name: string;
    label?: string;
    type?: "text" | "email" | "tel" | "url" | "number" | "password";
    placeholder?: string;
    required?: boolean;
}
export declare function Input({ name, label, type, placeholder, required, }: InputProps): import("preact").JSX.Element;
