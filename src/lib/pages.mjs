/**
 * Site structure. There is no separate routing model: the URL *is* the file path, which
 * is what Astro already does, so a developer and an owner are looking at the same thing.
 */
const PAGES_DIR = "src/pages";

/** src/pages/work/index.astro -> /work/ ; src/pages/about.astro -> /about */
export function routeFor(path) {
  const rel = path.replace(/^src\/pages\//, "").replace(/\.astro$/, "");
  if (rel === "index") return "/";
  if (rel.endsWith("/index")) return `/${rel.slice(0, -"/index".length)}/`;
  return `/${rel}`;
}

/** The inverse, for creating a page from a URL the owner typed. */
export function pathForRoute(route) {
  const clean = route.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!clean) return `${PAGES_DIR}/index.astro`;
  return `${PAGES_DIR}/${clean}/index.astro`;
}

/**
 * A URL the owner can actually type, and that Astro can actually serve.
 * Each path segment is slugified on its own, so "Work / Case Study" becomes
 * /work/case-study rather than /work-/-case-study.
 */
export function normaliseRoute(input) {
  const segments = String(input)
    .toLowerCase()
    .split("/")
    .map((segment) =>
      segment
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip accents rather than the letter
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/[\s-]+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .filter(Boolean);
  return segments.length ? `/${segments.join("/")}` : "";
}

/** Pages the editor may open. The editor's own route is not one of them. */
export function listPages(paths) {
  return paths
    .filter((p) => p.startsWith(`${PAGES_DIR}/`) && p.endsWith(".astro"))
    .filter((p) => !p.startsWith(`${PAGES_DIR}/edit/`))
    .map((p) => ({ path: p, route: routeFor(p) }))
    .sort((a, b) =>
      a.route === "/" ? -1 : b.route === "/" ? 1 : a.route.localeCompare(b.route),
    );
}

/** A new page starts as a layout wrapping nothing; the owner adds sections to it. */
export function blankPage(title) {
  return `---
import Site from '${"../".repeat(1)}layouts/Site.astro';
---
<Site title="${title.replace(/"/g, "&quot;")}">
</Site>
`;
}

/** Depth-aware import prefix, because a nested page sits further from src/. */
export function relativePrefix(pagePath) {
  const depth = pagePath.replace(/^src\//, "").split("/").length - 1;
  return "../".repeat(depth);
}
