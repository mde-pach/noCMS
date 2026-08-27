import assert from "node:assert/strict";
import { test } from "node:test";
import {
  listPages,
  normaliseRoute,
  pathForRoute,
  relativePrefix,
  routeFor,
} from "../src/lib/pages.mjs";

test("the URL is the file path", () => {
  assert.equal(routeFor("src/pages/index.astro"), "/");
  assert.equal(routeFor("src/pages/about.astro"), "/about");
  assert.equal(routeFor("src/pages/work/index.astro"), "/work/");
  assert.equal(routeFor("src/pages/work/thing.astro"), "/work/thing");
});

test("creating a page from a URL round-trips", () => {
  for (const route of ["/about", "/work/case-study"]) {
    assert.equal(routeFor(pathForRoute(route)), `${route}/`);
  }
  assert.equal(pathForRoute("/"), "src/pages/index.astro");
});

test("routes are normalised to something Astro can serve", () => {
  assert.equal(normaliseRoute("  About Us! "), "/about-us");
  assert.equal(normaliseRoute("Work / Case Study"), "/work/case-study");
  assert.equal(normaliseRoute("///"), "");
  assert.equal(normaliseRoute("Ünïcødé"), "/unicde", "accents are folded, not dropped");
  assert.equal(normaliseRoute("a//b"), "/a/b", "empty segments collapse");
});

test("the editor's own route is never listed as a page", () => {
  const pages = listPages([
    "src/pages/index.astro",
    "src/pages/edit/index.astro",
    "src/pages/about.astro",
    "src/styles/theme.css",
  ]);
  assert.deepEqual(
    pages.map((p) => p.route),
    ["/", "/about"],
  );
});

test("home sorts first, the rest alphabetically", () => {
  const pages = listPages([
    "src/pages/zebra.astro",
    "src/pages/about.astro",
    "src/pages/index.astro",
  ]);
  assert.deepEqual(
    pages.map((p) => p.route),
    ["/", "/about", "/zebra"],
  );
});

test("import depth follows how deep the page sits", () => {
  assert.equal(relativePrefix("src/pages/index.astro"), "../");
  assert.equal(relativePrefix("src/pages/work/index.astro"), "../../");
});
