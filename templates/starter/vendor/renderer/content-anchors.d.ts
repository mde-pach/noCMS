import type { VNode } from "preact";
export interface AnchorInput {
    /** dotted path into the props value, e.g. `items.2.title` */
    path: string;
}
export interface Anchor {
    path: string;
    /** the token survived the render and was located in the output */
    found: boolean;
    /** name of the element wrapping the located token — diagnostic for the spike */
    enclosingTag?: string;
}
export declare function sentinelFor(index: number): string;
/**
 * Probe where each content path renders. `render` turns props into the component's VNode —
 * the host builds it (`(p) => h(Component, p)`), keeping this module free of any schema or
 * registry. Every path is replaced with its token in one cloned props object and rendered
 * once; a token found in the output (even as a substring, after interpolation, or upper-cased)
 * pins that path to a DOM location. A token that's gone was computed away — that leaf simply
 * falls back to selecting its parent, never the wrong node.
 */
export declare function probeContentAnchors(render: (props: Record<string, unknown>) => VNode, props: Record<string, unknown>, paths: AnchorInput[]): Anchor[];
