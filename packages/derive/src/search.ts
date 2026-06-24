import type { CollectionEntry } from "@nocms/core";
import type { DerivedArtifact, DeriveInput } from "./index";

// A content-based search index precomputed in the ② tier and served from the ①
// tier: the index is built from the entries themselves (not crawled from built
// HTML), so it has no dependency on the publish build and stays a plain file the
// runtime fetches. Postings (token → document ids) are precomputed so the client
// only intersects short id lists at query time.

export interface SearchDocument {
  id: number;
  collection: string;
  path: string;
  title: string;
  /** A short plain-text excerpt for result display. */
  excerpt: string;
}

export interface SearchIndex {
  documents: SearchDocument[];
  /** Token → ascending, de-duplicated document ids. */
  postings: Record<string, number[]>;
}

const EXCERPT_LENGTH = 200;
const MIN_TOKEN_LENGTH = 2;

// Reduce an MDX body to searchable plain text. This is deliberately lightweight
// (regex, not a full MDX parse): search tolerates lossy text, and pulling the MDX
// compiler into the batch tier for this would be disproportionate.
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

/** Lowercased word tokens of at least `MIN_TOKEN_LENGTH` characters. */
export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return matches.filter((token) => token.length >= MIN_TOKEN_LENGTH);
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

export function buildSearchIndex(entries: CollectionEntry[]): SearchIndex {
  const documents: SearchDocument[] = [];
  const postings = new Map<string, Set<number>>();

  entries.forEach((entry, id) => {
    const title = titleOf(entry);
    const text = plainText(entry.body);
    documents.push({
      id,
      collection: entry.collection,
      path: entry.path,
      title,
      excerpt: excerptOf(text),
    });
    // The title is searchable too, so fold it into the token stream.
    for (const token of tokenize(`${title} ${text}`)) {
      let ids = postings.get(token);
      if (!ids) {
        ids = new Set();
        postings.set(token, ids);
      }
      ids.add(id);
    }
  });

  const sortedPostings: Record<string, number[]> = {};
  for (const token of [...postings.keys()].sort()) {
    sortedPostings[token] = [...(postings.get(token) ?? [])].sort((a, b) => a - b);
  }

  return { documents, postings: sortedPostings };
}

/** Emit a single search.json the site fetches and queries at runtime. */
export function runSearch(input: DeriveInput): DerivedArtifact[] {
  const index = buildSearchIndex(input.entries);
  return [{ path: "search.json", contents: `${JSON.stringify(index)}\n` }];
}
