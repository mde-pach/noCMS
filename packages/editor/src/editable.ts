// Editor-only: annotates each element with `data-mdx-pos` (its mdast source offset) so a canvas
// click resolves back to the MDX source. The publish path never runs this, so published HTML stays clean.
//
// MDX dev mode hands the JSX runtime each element's source line/column. Intrinsics take the
// attribute directly; components don't forward unknown props, so each is wrapped in a
// `display:contents` carrier that holds the position without affecting layout.

import { type EvaluateOptions, evaluate } from "@mdx-js/mdx";
import type { ComponentMap, RenderInput } from "@nocms/renderer";
import { type ComponentType, h, type VNode } from "preact";
import * as jsxDevRuntime from "preact/jsx-dev-runtime";
import remarkFrontmatter from "remark-frontmatter";

const POS_ATTR = "data-mdx-pos";

interface DevSource {
  lineNumber: number;
  columnNumber: number;
}

type JsxDEV = (
  type: unknown,
  props: Record<string, unknown>,
  key: unknown,
  isStaticChildren: boolean,
  source: unknown,
  self: unknown,
) => VNode;

/** Maps a 1-based (line, column) to its 0-based character offset in `source`. */
function offsetMapper(source: string): (line: number, column: number) => number {
  const lineStart: number[] = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") lineStart.push(i + 1);
  }
  return (line, column) => (lineStart[line - 1] ?? 0) + (column - 1);
}

function annotatingJsxDEV(toOffset: (line: number, column: number) => number): JsxDEV {
  const base = jsxDevRuntime.jsxDEV as unknown as JsxDEV;
  return (type, props, key, isStaticChildren, source, self) => {
    const src = source as DevSource | undefined;
    if (!src) return base(type, props, key, isStaticChildren, source, self);
    const offset = toOffset(src.lineNumber, src.columnNumber);
    if (typeof type === "string") {
      return base(
        type,
        { ...props, [POS_ATTR]: offset },
        key,
        isStaticChildren,
        source,
        self,
      );
    }
    const element = base(type, props, key, isStaticChildren, source, self);
    return base(
      "span",
      { [POS_ATTR]: offset, style: "display:contents", children: element },
      undefined,
      false,
      source,
      self,
    );
  };
}

function editableOptions(mdx: string): EvaluateOptions {
  return {
    development: true,
    jsxDEV: annotatingJsxDEV(offsetMapper(mdx)),
    Fragment: jsxDevRuntime.Fragment,
    remarkPlugins: [remarkFrontmatter],
  } as unknown as EvaluateOptions;
}

/** Same renderer and component tree as publish, only annotated with `data-mdx-pos` source offsets for the editor canvas. */
export async function renderEditableToVNode(input: RenderInput): Promise<VNode> {
  const { default: Content } = (await evaluate(
    input.mdx,
    editableOptions(input.mdx),
  )) as {
    default: ComponentType<{ components?: ComponentMap } & Record<string, unknown>>;
  };
  return h(Content, { components: input.components, ...input.data });
}
