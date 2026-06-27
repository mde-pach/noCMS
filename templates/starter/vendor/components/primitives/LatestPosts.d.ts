import * as v from "valibot";
export declare const LatestPostsSchema: v.ObjectSchema<{
    /** how many items to show */
    readonly limit: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 1, undefined>, v.MaxValueAction<number, 20, undefined>]>, 5>;
    /** heading above the list */
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, "Latest">;
}, undefined>;
export type LatestPostsProps = v.InferInput<typeof LatestPostsSchema>;
export declare function LatestPosts({ limit, title }: LatestPostsProps): import("preact").JSX.Element;
