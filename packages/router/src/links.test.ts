import { describe, expect, it } from "vitest";
import { breadcrumbs, isActiveRoute } from "./links";
import { routeTableFromPaths } from "./table";

describe("breadcrumbs", () => {
  const table = routeTableFromPaths(["/", "/posts", "/posts/a"]);

  it("returns the root for the root", () => {
    expect(breadcrumbs(table, "/").map((c) => c.path)).toEqual(["/"]);
  });

  it("builds a trail of real ancestor routes, root-first", () => {
    expect(breadcrumbs(table, "/posts/a").map((c) => c.path)).toEqual([
      "/",
      "/posts",
      "/posts/a",
    ]);
  });

  it("skips ancestors that have no own page", () => {
    const sparse = routeTableFromPaths(["/", "/posts/a"]);
    expect(breadcrumbs(sparse, "/posts/a").map((c) => c.path)).toEqual([
      "/",
      "/posts/a",
    ]);
  });

  it("applies the deployment base to each href", () => {
    const crumbs = breadcrumbs(table, "/posts/a", "/repo/");
    expect(crumbs.map((c) => c.href)).toEqual([
      "/repo/",
      "/repo/posts",
      "/repo/posts/a",
    ]);
  });

  it("carries the matched route payload", () => {
    expect(breadcrumbs(table, "/posts").at(-1)?.route.data).toBe("/posts");
  });
});

describe("isActiveRoute", () => {
  it("matches an identical path", () => {
    expect(isActiveRoute("/posts/a", "/posts/a")).toBe(true);
  });

  it("treats a parent as active for its descendants", () => {
    expect(isActiveRoute("/posts/a", "/posts")).toBe(true);
  });

  it("does not treat a sibling prefix as active", () => {
    expect(isActiveRoute("/postscript", "/posts")).toBe(false);
  });

  it("honors exact matching", () => {
    expect(isActiveRoute("/posts/a", "/posts", { exact: true })).toBe(false);
    expect(isActiveRoute("/posts", "/posts", { exact: true })).toBe(true);
  });

  it("activates the root only on the root", () => {
    expect(isActiveRoute("/", "/")).toBe(true);
    expect(isActiveRoute("/posts", "/")).toBe(false);
  });

  it("normalizes trailing slashes", () => {
    expect(isActiveRoute("/posts/a/", "/posts")).toBe(true);
  });
});
