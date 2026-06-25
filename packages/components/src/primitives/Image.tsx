import * as v from "valibot";

// `src` carries the `image` meta-type so the editor gives it a media picker
// (D9), not a bare text box.
export const ImageSchema = v.object({
  src: v.pipe(v.string(), v.metadata({ control: "image" })),
  alt: v.string(),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  rounded: v.optional(v.boolean(), false),
});

export type ImageProps = v.InferInput<typeof ImageSchema>;

// A responsive, lazy-loaded image.
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
