// Owns the editing model — the parsed MDX `doc` and the undo history — and every command that
// changes it (insert/delete/duplicate/move/frontmatter). Everything funnels through `commit` (or
// `pushApply` for in-place text) so undo/redo stays one uniform stack. Renders nothing and holds
// no selection: it takes a `select` callback and reports changes via `onChange`.

import type { ComponentManifest } from "@nocms/components";
import type { Nodes, Parent } from "mdast";
import type { CanvasHandle } from "./canvas.js";
import { writeFrontmatter } from "./frontmatter.js";
import { createHistory } from "./history.js";
import { blockFromManifest, insertBlock } from "./insert.js";
import { type MdxDocument, parseMdx, serializeMdx } from "./mdx-document.js";
import { type IndexPath, nodeAtIndexPath } from "./position.js";
import { insertAt, moveChild, removeAt } from "./tree-edit.js";

function childrenOf(node: Nodes | undefined): Nodes[] {
  return node && "children" in node ? (node as Parent).children : [];
}

export interface DocumentStore {
  /** the live parsed document; nodes may be mutated in place (then call `handleEdit`). */
  readonly doc: MdxDocument;
  /** the current document serialized to canonical MDX. */
  serialize(): string;
  /** how many children the container at `path` has — the bound for reorder. */
  childCountAt(path: IndexPath): number;
  /** after an in-place node mutation (e.g. a props edit): re-serialize, repaint, keep selection. */
  handleEdit(): Promise<void>;
  /** replace the document with `mdx`, repaint, select `path`, push history, notify. */
  commit(mdx: string, path: IndexPath | undefined): Promise<void>;
  /** replace + repaint + select without pushing history or notifying (undo/redo internals). */
  apply(mdx: string, path: IndexPath | undefined): Promise<void>;
  /** snapshot the current (already-mutated) doc into history and repaint — for prose commit, where
   *  onChange already fired during typing. Returns `path`. */
  pushApply(path: IndexPath | undefined): Promise<IndexPath | undefined>;
  undo(): void;
  redo(): void;
  /** insert a catalog component after `afterPath`'s top-level ancestor; selects the new block. */
  insertManifest(
    manifest: ComponentManifest,
    afterPath: IndexPath | undefined,
  ): Promise<void>;
  /** remove / duplicate / reorder the block at `path` (no-op for an empty path). */
  remove(path: IndexPath | undefined): Promise<void>;
  duplicate(path: IndexPath | undefined): Promise<void>;
  move(path: IndexPath | undefined, direction: -1 | 1): Promise<void>;
  /** rewrite one frontmatter key (off-canvas, so no repaint). */
  editFrontmatter(key: string, value: string): void;
}

export interface DocumentStoreDeps {
  initialMdx: string;
  /** the canvas is created after the store is constructed, so it is fetched lazily. */
  getCanvas: () => CanvasHandle;
  select: (path: IndexPath | undefined) => void;
  getSelectedPath: () => IndexPath | undefined;
  onChange?: (mdx: string) => void;
  markDirty: () => void;
}

export function createDocumentStore(deps: DocumentStoreDeps): DocumentStore {
  const { getCanvas, select, getSelectedPath, onChange, markDirty } = deps;
  let doc = parseMdx(deps.initialMdx);
  const history = createHistory(serializeMdx(doc));

  const serialize = (): string => serializeMdx(doc);

  const apply = async (mdx: string, path: IndexPath | undefined): Promise<void> => {
    doc = parseMdx(mdx);
    await getCanvas().update(mdx);
    select(path);
  };

  const commit = async (mdx: string, path: IndexPath | undefined): Promise<void> => {
    history.push(mdx);
    await apply(mdx, path);
    onChange?.(mdx);
    markDirty();
  };

  return {
    get doc() {
      return doc;
    },
    serialize,
    childCountAt: (path) => childrenOf(nodeAtIndexPath(doc, path)).length,
    apply,
    commit,

    async handleEdit() {
      const next = serialize();
      history.push(next);
      await getCanvas().update(next);
      getCanvas().highlight(getSelectedPath());
      onChange?.(next);
      markDirty();
    },

    async pushApply(path) {
      const next = serialize();
      history.push(next);
      await apply(next, path);
      return path;
    },

    undo() {
      const state = history.undo();
      if (state === undefined) return;
      void apply(state, undefined).then(() => onChange?.(state));
    },

    redo() {
      const state = history.redo();
      if (state === undefined) return;
      void apply(state, undefined).then(() => onChange?.(state));
    },

    async insertManifest(manifest, afterPath) {
      const path = insertBlock(doc, blockFromManifest(manifest), afterPath);
      await commit(serialize(), path);
    },

    async remove(path) {
      if (!path || path.length === 0) return;
      await commit(serializeMdx(removeAt(doc, path)), undefined);
    },

    async duplicate(path) {
      if (!path || path.length === 0) return;
      const node = nodeAtIndexPath(doc, path);
      if (!node) return;
      const parentPath = path.slice(0, -1);
      const index = path[path.length - 1] ?? 0;
      const next = insertAt(doc, parentPath, index + 1, node);
      await commit(serializeMdx(next), [...parentPath, index + 1]);
    },

    async move(path, direction) {
      if (!path || path.length === 0) return;
      const parentPath = path.slice(0, -1);
      const from = path[path.length - 1] ?? 0;
      const count = childrenOf(nodeAtIndexPath(doc, parentPath)).length;
      const to = Math.max(0, Math.min(from + direction, count - 1));
      if (to === from) return;
      const next = moveChild(doc, parentPath, from, to);
      await commit(serializeMdx(next), [...parentPath, to]);
    },

    editFrontmatter(key, value) {
      writeFrontmatter(doc, key, value);
      const next = serialize();
      history.push(next);
      onChange?.(next);
      markDirty();
    },
  };
}
