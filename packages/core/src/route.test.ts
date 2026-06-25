import { describe, expect, it } from "vitest";
import {
  contentPathToRoute,
  href,
  type LocaleManifest,
  localeLinks,
  normalizeRoutePath,
  type RepoPath,
  routeToContentPath,
} from "./index";

const repo = (p: string) => p as RepoPath;

describe("contentPathToRoute", () => {
  it("maps the root index to /", () => {
    expect(contentPathToRoute(repo("content/index.mdx"))).toBe("/");
  });

  it("maps a nested file to its path", () => {
    expect(contentPathToRoute(repo("content/posts/a.mdx"))).toBe("/posts/a");
  });

  it("collapses a trailing index segment", () => {
    expect(contentPathToRoute(repo("content/posts/index.mdx"))).toBe("/posts");
  });

  it("handles deeply nested paths", () => {
    expect(contentPathToRoute(repo("content/a/b/c.mdx"))).toBe("/a/b/c");
    expect(contentPathToRoute(repo("content/a/b/index.mdx"))).toBe("/a/b");
  });

  it("accepts .md as well as .mdx", () => {
    expect(contentPathToRoute(repo("content/about.md"))).toBe("/about");
  });

  it("accepts a path already relative to content/", () => {
    expect(contentPathToRoute("posts/a.mdx")).toBe("/posts/a");
    expect(contentPathToRoute("index.mdx")).toBe("/");
  });

  it("does not strip a non-leading content segment", () => {
    expect(contentPathToRoute(repo("content/content/a.mdx"))).toBe("/content/a");
  });
});

describe("routeToContentPath", () => {
  it("inverts to the canonical index.mdx form", () => {
    expect(routeToContentPath("/")).toBe("content/index.mdx");
    expect(routeToContentPath("/posts")).toBe("content/posts/index.mdx");
    expect(routeToContentPath("/a/b/c")).toBe("content/a/b/c/index.mdx");
  });

  it("tolerates trailing slashes", () => {
    expect(routeToContentPath("/posts/")).toBe("content/posts/index.mdx");
  });

  it("round-trips index-form content paths", () => {
    for (const route of ["/", "/posts", "/a/b"]) {
      expect(contentPathToRoute(routeToContentPath(route))).toBe(route);
    }
  });
});

describe("normalizeRoutePath", () => {
  it("adds a leading slash", () => {
    expect(normalizeRoutePath("posts/a")).toBe("/posts/a");
  });

  it("strips trailing slashes", () => {
    expect(normalizeRoutePath("/posts/a/")).toBe("/posts/a");
    expect(normalizeRoutePath("/posts///")).toBe("/posts");
  });

  it("keeps the root as /", () => {
    expect(normalizeRoutePath("/")).toBe("/");
    expect(normalizeRoutePath("")).toBe("/");
  });
});

describe("href", () => {
  it("joins a normalized base", () => {
    expect(href("/posts/a", "/repo/")).toBe("/repo/posts/a");
  });

  it("normalizes a base missing its trailing slash", () => {
    expect(href("/posts/a", "/repo")).toBe("/repo/posts/a");
  });

  it("defaults to a root base", () => {
    expect(href("/posts/a")).toBe("/posts/a");
    expect(href("/")).toBe("/");
  });

  it("joins the root route against a project base", () => {
    expect(href("/", "/repo/")).toBe("/repo/");
  });
});

describe("localeLinks", () => {
  const manifest: LocaleManifest = {
    locales: ["en", "fr"],
    groups: [
      { translations: { en: "/", fr: "/fr" } },
      { translations: { en: "/about", fr: "/fr/about" } },
      { translations: { en: "/en-only" } },
    ],
  };

  it("returns one link per locale of the current page's group, marking the current", () => {
    expect(localeLinks(manifest, "/fr/about")).toEqual([
      { locale: "en", route: "/about", href: "/about", current: false },
      { locale: "fr", route: "/fr/about", href: "/fr/about", current: true },
    ]);
  });

  it("orders links by the manifest locale order and applies the base", () => {
    expect(localeLinks(manifest, "/", "/repo/")).toEqual([
      { locale: "en", route: "/", href: "/repo/", current: true },
      { locale: "fr", route: "/fr", href: "/repo/fr", current: false },
    ]);
  });

  it("omits locales the page has no translation for", () => {
    expect(localeLinks(manifest, "/en-only")).toEqual([
      { locale: "en", route: "/en-only", href: "/en-only", current: true },
    ]);
  });

  it("returns nothing for a route outside any group", () => {
    expect(localeLinks(manifest, "/missing")).toEqual([]);
  });
});
