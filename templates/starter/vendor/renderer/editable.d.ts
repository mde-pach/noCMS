import { type VNode } from "preact";
import type { RenderInput } from "./index.js";
/** Same renderer and component tree as publish, only annotated with `data-mdx-pos` source offsets for the editor canvas. */
export declare function renderEditableToVNode(input: RenderInput): Promise<VNode>;
