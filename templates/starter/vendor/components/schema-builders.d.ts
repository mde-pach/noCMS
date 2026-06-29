import * as v from "valibot";
export declare const SURFACE_ROLES: readonly ["page", "surface", "subtle", "brand"];
export type SurfaceRole = (typeof SURFACE_ROLES)[number];
export declare const surfaceField: (role: SurfaceRole) => v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<readonly ["page", "surface", "subtle", "brand"], undefined>, v.MetadataAction<"page" | "surface" | "subtle" | "brand", {
    readonly control: "color";
}>]>, "page" | "surface" | "subtle" | "brand">;
export declare const richText: () => v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "richtext";
}>]>;
export declare const optionalRichText: (fallback?: string) => v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "richtext";
}>]>, string>;
export declare const urlProp: () => v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "url";
}>]>;
export declare const linkField: (href?: string) => v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "url";
}>]>, string>;
export declare const optionalUrl: () => v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "url";
}>]>, undefined>;
export declare const imageProp: () => v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "image";
}>]>;
export declare const imageField: () => v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "image";
}>]>, undefined>;
