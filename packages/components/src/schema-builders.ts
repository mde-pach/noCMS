import * as v from "valibot";

export const SURFACE_ROLES = ["page", "surface", "subtle", "brand"] as const;
export type SurfaceRole = (typeof SURFACE_ROLES)[number];

export const surfaceField = (role: SurfaceRole) =>
  v.optional(v.pipe(v.picklist(SURFACE_ROLES), v.metadata({ control: "color" })), role);

export const richText = () => v.pipe(v.string(), v.metadata({ control: "richtext" }));

export const optionalRichText = (fallback?: string) =>
  fallback === undefined ? v.optional(richText()) : v.optional(richText(), fallback);

export const urlProp = () => v.pipe(v.string(), v.metadata({ control: "url" }));

export const linkField = (href = "#") => v.optional(urlProp(), href);

export const optionalUrl = () => v.optional(urlProp());

export const imageProp = () => v.pipe(v.string(), v.metadata({ control: "image" }));

export const imageField = () => v.optional(imageProp());
