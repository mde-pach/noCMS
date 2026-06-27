import type { ComponentManifest } from "@nocms/components";
import type { RootContent } from "mdast";
import { buildJsxElement, type PropValue } from "./jsx-attributes.js";
import type { MdxDocument } from "./mdx-document.js";
import type { IndexPath } from "./position.js";

/** A new JSX node for `manifest`, carrying its starter defaults and a child region when
 *  the component declares slots. */
export function blockFromManifest(manifest: ComponentManifest): RootContent {
  const props = manifest.defaults as Record<string, PropValue>;
  const withChildren = (manifest.slots?.length ?? 0) > 0;
  return buildJsxElement(manifest.name, props, withChildren) as RootContent;
}

/**
 * Splice `node` into the document as a top-level block, after the top-level ancestor of
 * `afterPath` when given, else at the end. Returns the new node's index-path so the shell can
 * select it. Insertion is top-level only; nesting into a slot is not yet supported.
 */
export function insertBlock(
  doc: MdxDocument,
  node: RootContent,
  afterPath?: IndexPath,
): IndexPath {
  const at =
    afterPath && afterPath.length > 0 && afterPath[0] !== undefined
      ? afterPath[0] + 1
      : doc.children.length;
  doc.children.splice(at, 0, node);
  return [at];
}
