import { type CollectionEntry, parseEntry, type RepoPath } from "@nocms/core";
import { describe, expect, it } from "vitest";
import { serializeEntry } from "./serialize";

const path = (p: string) => p as RepoPath;

describe("serializeEntry", () => {
  it("round-trips an entry through core's parseEntry", () => {
    const entry: CollectionEntry = {
      collection: "posts",
      path: path("content/posts/a.mdx"),
      data: { title: "Hello", tags: ["x", "y"] },
      body: "# Hi\n\nSome **MDX** body.",
    };
    const change = serializeEntry(entry);
    const parsed = parseEntry(entry.collection, entry.path, change.contents);
    expect(parsed.data).toEqual(entry.data);
    expect(parsed.body).toBe(entry.body);
  });

  it("emits no front-matter block when data is empty", () => {
    const change = serializeEntry({
      collection: "pages",
      path: path("content/index.mdx"),
      data: {},
      body: "# Home",
    });
    expect(change.contents).toBe("# Home");
    expect(change.encoding).toBe("utf-8");
  });
});
