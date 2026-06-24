export interface ButtonProps {
    label: string;
    href?: string;
    variant?: "primary" | "secondary";
}
export declare function Button({ label, href, variant }: ButtonProps): import("preact").JSX.Element;
