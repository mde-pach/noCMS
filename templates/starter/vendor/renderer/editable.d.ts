import { type VNode } from "preact";
import type { RenderInput } from "./index.js";
/**
 * Compile MDX to a Preact tree whose DOM carries `data-mdx-pos` source offsets, for the
 * editor canvas. Same renderer, same component tree as publish — only annotated.
 */
export declare function renderEditableToVNode(input: RenderInput): Promise<VNode>;
