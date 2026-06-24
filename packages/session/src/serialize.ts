import type { CollectionEntry } from "@nocms/core";
import type { FileChange } from "@nocms/github";
import { stringify as stringifyYaml } from "yaml";

// Inverse of core's parseEntry: front-matter `data` plus the MDX `body` back to
// a UTF-8 FileChange. MDX text stays the source of truth — the body is preserved
// verbatim; only the YAML front-matter is re-emitted. The editor owns richer body
// re-serialization (mdast→MDX); a session that already holds serialized text uses
// stage() directly and skips this.
export function serializeEntry(entry: CollectionEntry): FileChange {
  const frontmatter =
    Object.keys(entry.data).length > 0
      ? `---\n${stringifyYaml(entry.data).trimEnd()}\n---\n\n`
      : "";
  return { path: entry.path, contents: frontmatter + entry.body, encoding: "utf-8" };
}
