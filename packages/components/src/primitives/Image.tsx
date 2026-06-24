export interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  rounded?: boolean;
}

// A responsive, lazy-loaded image. `src` is a plain string today; the editor can
// promote it to a media picker via field-config.
export function Image({ src, alt, width, height, rounded = false }: ImageProps) {
  return (
    <img
      class="image"
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      style={{
        maxWidth: "100%",
        height: "auto",
        borderRadius: rounded ? "var(--radius-md)" : undefined,
      }}
    />
  );
}
