import type { CollectionEntry } from "@nocms/core";
import type { FileChange } from "@nocms/github";
import { stringify as stringifyYaml } from "yaml";

// Inverse of core's parseEntry: the MDX body is preserved verbatim; only the YAML
// front-matter is re-emitted.
export function serializeEntry(entry: CollectionEntry): FileChange {
  const frontmatter =
    Object.keys(entry.data).length > 0
      ? `---\n${stringifyYaml(entry.data).trimEnd()}\n---\n\n`
      : "";
  return { path: entry.path, contents: frontmatter + entry.body, encoding: "utf-8" };
}
