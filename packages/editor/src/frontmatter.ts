// Read and write the page's YAML frontmatter as plain key/value lines, directly on the mdast
// `yaml` node so the document stays MDX text (line-mergeable, nothing re-derived from rendered
// output). The editor only edits a couple of scalar keys (title, description); a value is matched
// and rewritten line-by-line rather than through a YAML parser, which keeps the rest of the block
// — comments, ordering, unknown keys — untouched.

import type { Yaml } from "mdast";
import type { MdxDocument } from "./mdx-document.js";

function frontmatterNode(doc: MdxDocument): Yaml | undefined {
  return doc.children.find((n): n is Yaml => n.type === "yaml");
}

export function readFrontmatter(doc: MdxDocument): {
  title: string;
  description: string;
} {
  const text = frontmatterNode(doc)?.value ?? "";
  const get = (key: string): string => {
    const match = text.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
    return match?.[1] ? match[1].trim().replace(/^["']|["']$/g, "") : "";
  };
  return { title: get("title"), description: get("description") };
}

export function writeFrontmatter(doc: MdxDocument, key: string, value: string): void {
  let node = frontmatterNode(doc);
  if (!node) {
    node = { type: "yaml", value: "" };
    doc.children.unshift(node);
  }
  const line = `${key}: ${value}`;
  const re = new RegExp(`^${key}:.*$`, "m");
  node.value = re.test(node.value)
    ? node.value.replace(re, line)
    : node.value
      ? `${node.value}\n${line}`
      : line;
}
