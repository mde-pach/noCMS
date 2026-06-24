import { describe, expect, it } from "vitest";
import { contentPathToRoute, normalizeBase, routeToFilePath } from "./build-site";

describe("contentPathToRoute", () => {
  it("maps index to root and files to their path", () => {
    expect(contentPathToRoute("index.mdx")).toBe("/");
    expect(contentPathToRoute("about.mdx")).toBe("/about");
    expect(contentPathToRoute("blog/index.mdx")).toBe("/blog");
    expect(contentPathToRoute("blog/first-post.mdx")).toBe("/blog/first-post");
  });
});

describe("routeToFilePath", () => {
  it("emits clean-URL directory index files", () => {
    expect(routeToFilePath("/")).toBe("index.html");
    expect(routeToFilePath("/about")).toBe("about/index.html");
    expect(routeToFilePath("/blog/first-post")).toBe("blog/first-post/index.html");
  });
});

describe("normalizeBase", () => {
  it("guarantees a non-empty slash-terminated base", () => {
    expect(normalizeBase("")).toBe("/");
    expect(normalizeBase("/")).toBe("/");
    expect(normalizeBase("/repo")).toBe("/repo/");
    expect(normalizeBase("/repo/")).toBe("/repo/");
  });
});
