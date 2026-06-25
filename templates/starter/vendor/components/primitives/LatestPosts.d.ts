export interface LatestPostsProps {
    /** how many items to show */
    limit?: number;
    /** heading above the list */
    title?: string;
}
export declare function LatestPosts({ limit, title }: LatestPostsProps): import("preact").JSX.Element;
