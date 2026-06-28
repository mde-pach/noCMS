import * as v from "valibot";
import { cx } from "../cx";

// `src` carries the `image` meta-type so the editor gives it a media picker, not a text box.
export const ImageSchema = v.object({
  src: v.pipe(v.string(), v.metadata({ control: "image" })),
  alt: v.string(),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  rounded: v.optional(v.boolean(), false),
});

export type ImageProps = v.InferInput<typeof ImageSchema> & {
  class?: string;
  className?: string;
};

export function Image({
  src,
  alt,
  width,
  height,
  rounded = false,
  class: cls,
  className,
}: ImageProps) {
  return (
    <img
      class={cx("max-w-full h-auto", rounded && "rounded-md", className, cls)}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
    />
  );
}
