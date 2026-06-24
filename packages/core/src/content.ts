import { parse as parseYaml } from "yaml";
import type { CollectionEntry, RepoPath } from "./index";

// A leading `---` block delimits YAML front-matter from the MDX body. Newlines
// between the closing delimiter and the body are consumed so the body starts at
// real content.
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n*/;

export interface ParsedDocument {
  data: Record<string, unknown>;
  body: string;
}

/** Split a document into its front-matter `data` and the MDX `body`. */
export function parseFrontmatter(source: string): ParsedDocument {
  const match = FRONTMATTER.exec(source);
  if (!match) return { data: {}, body: source };

  const parsed = parseYaml(match[1] ?? "") ?? {};
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("front-matter must be a YAML mapping");
  }
  return {
    data: parsed as Record<string, unknown>,
    body: source.slice(match[0].length),
  };
}

/** Parse a source file into a collection entry. */
export function parseEntry(
  collection: string,
  path: RepoPath,
  source: string,
): CollectionEntry {
  const { data, body } = parseFrontmatter(source);
  return { collection, path, data, body };
}
