import type { CollectionEntry, RepoPath } from "@nocms/core";
import { describe, expect, it } from "vitest";
import {
  createRouteTable,
  matchRoute,
  routeTableFromEntries,
  routeTableFromPaths,
} from "./table";

const entry = (path: string): CollectionEntry => ({
  collection: "pages",
  path: path as RepoPath,
  data: {},
  body: "",
});

describe("routeTableFromEntries", () => {
  it("maps each entry's content path to a static route", () => {
    const table = routeTableFromEntries([
      entry("content/index.mdx"),
      entry("content/about.mdx"),
      entry("content/posts/a.mdx"),
      entry("content/posts/index.mdx"),
    ]);
    const paths = table.routes.map((r) => r.path).sort();
    expect(paths).toEqual(["/", "/about", "/posts", "/posts/a"]);
  });

  it("returns the matched entry as the route payload", () => {
    const a = entry("content/posts/a.mdx");
    const table = routeTableFromEntries([a]);
    const match = matchRoute(table, "/posts/a");
    expect(match?.route.data).toBe(a);
  });
});

describe("matchRoute — static", () => {
  const table = routeTableFromPaths(["/", "/about", "/posts/a"]);

  it("matches the root", () => {
    expect(matchRoute(table, "/")?.route.path).toBe("/");
  });

  it("matches a nested path", () => {
    expect(matchRoute(table, "/posts/a")?.route.path).toBe("/posts/a");
  });

  it("tolerates a trailing slash", () => {
    expect(matchRoute(table, "/posts/a/")?.route.path).toBe("/posts/a");
  });

  it("returns null for an unknown path", () => {
    expect(matchRoute(table, "/nope")).toBeNull();
    expect(matchRoute(table, "/posts/a/b")).toBeNull();
  });

  it("captures no params for static routes", () => {
    expect(matchRoute(table, "/about")?.params).toEqual({});
  });
});

describe("matchRoute — base stripping", () => {
  const table = routeTableFromPaths(["/", "/posts/a"]);

  it("strips a project-Pages base before matching", () => {
    expect(matchRoute(table, "/repo/posts/a", "/repo/")?.route.path).toBe("/posts/a");
    expect(matchRoute(table, "/repo/", "/repo/")?.route.path).toBe("/");
    expect(matchRoute(table, "/repo", "/repo/")?.route.path).toBe("/");
  });

  it("does not strip a base that only prefix-collides", () => {
    expect(matchRoute(table, "/repository/posts/a", "/repo/")).toBeNull();
  });

  it("ignores a root base", () => {
    expect(matchRoute(table, "/posts/a", "/")?.route.path).toBe("/posts/a");
  });
});

describe("matchRoute — dynamic params", () => {
  const table = createRouteTable([
    { path: "/posts/:slug", data: "post" },
    { path: "/posts/:year/:month", data: "archive" },
  ]);

  it("captures a single param", () => {
    const match = matchRoute(table, "/posts/hello");
    expect(match?.route.data).toBe("post");
    expect(match?.params).toEqual({ slug: "hello" });
  });

  it("captures multiple params", () => {
    expect(matchRoute(table, "/posts/2026/06")?.params).toEqual({
      year: "2026",
      month: "06",
    });
  });

  it("decodes percent-encoded params", () => {
    expect(matchRoute(table, "/posts/a%20b")?.params).toEqual({ slug: "a b" });
  });

  it("prefers a static route over a param route at the same depth", () => {
    const mixed = createRouteTable([
      { path: "/posts/:slug", data: "param" },
      { path: "/posts/new", data: "static" },
    ]);
    expect(matchRoute(mixed, "/posts/new")?.route.data).toBe("static");
    expect(matchRoute(mixed, "/posts/other")?.route.data).toBe("param");
  });
});
