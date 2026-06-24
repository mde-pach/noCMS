export interface ImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    rounded?: boolean;
}
export declare function Image({ src, alt, width, height, rounded }: ImageProps): import("preact").JSX.Element;
