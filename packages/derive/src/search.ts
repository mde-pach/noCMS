import type { CollectionEntry } from "@nocms/core";
import MiniSearch, { type Options } from "minisearch";
import type { DerivedArtifact, DeriveInput } from "./index";

// The index is built from the entries themselves (not crawled from built HTML),
// serialized to a JSON file the runtime fetches and reloads with MiniSearch.

export interface SearchDocument {
  id: number;
  collection: string;
  path: string;
  title: string;
  text: string;
  excerpt: string;
}

// The build (here) and the runtime that loads the serialized index must agree on
// these options, so they are shared from this module.
export const SEARCH_OPTIONS: Options<SearchDocument> = {
  fields: ["title", "text"],
  storeFields: ["collection", "path", "title", "excerpt"],
};

const EXCERPT_LENGTH = 200;

// Deliberately lightweight (regex, not a full MDX parse): search tolerates lossy
// text, and pulling the MDX compiler in for this would be disproportionate.
export function plainText(mdxBody: string): string {
  return mdxBody
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/<\/?[A-Za-z][^>]*>/g, " ") // JSX/HTML tags
    .replace(/\{[^}]*\}/g, " ") // MDX expressions
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links/images → their text
    .replace(/^#{1,6}\s+/gm, " ") // heading markers
    .replace(/[*_~>#|-]+/g, " ") // residual markdown punctuation
    .replace(/\s+/g, " ")
    .trim();
}

function titleOf(entry: CollectionEntry): string {
  const title = entry.data.title;
  if (typeof title === "string" && title.trim()) return title;
  const base = entry.path.split("/").pop() ?? entry.path;
  return base.replace(/\.mdx?$/, "");
}

function excerptOf(text: string): string {
  if (text.length <= EXCERPT_LENGTH) return text;
  return `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

export function toSearchDocument(entry: CollectionEntry, id: number): SearchDocument {
  const title = titleOf(entry);
  const text = plainText(entry.body);
  return {
    id,
    collection: entry.collection,
    path: entry.path,
    title,
    text,
    excerpt: excerptOf(text),
  };
}

export function buildSearchIndex(
  entries: CollectionEntry[],
): MiniSearch<SearchDocument> {
  const index = new MiniSearch<SearchDocument>(SEARCH_OPTIONS);
  index.addAll(entries.map(toSearchDocument));
  return index;
}

export function runSearch(input: DeriveInput): DerivedArtifact[] {
  const index = buildSearchIndex(input.entries);
  return [{ path: "search.json", contents: `${JSON.stringify(index)}\n` }];
}
