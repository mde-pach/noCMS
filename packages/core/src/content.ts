import { parse as parseYaml } from "yaml";
import type { CollectionEntry, RepoPath } from "./index";

// Newlines between the closing `---` and the body are consumed so the body starts
// at real content, not blank lines.
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n*/;

export interface ParsedDocument {
  data: Record<string, unknown>;
  body: string;
}

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

export function parseEntry(
  collection: string,
  path: RepoPath,
  source: string,
): CollectionEntry {
  const { data, body } = parseFrontmatter(source);
  return { collection, path, data, body };
}
