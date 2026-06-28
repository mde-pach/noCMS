import { type CollectionEntry, contentPathToRoute } from "@nocms/core";
import type { DerivedArtifact, DeriveInput } from "./index";

// The sitemaps.org protocol requires absolute URLs, so this needs the deployed
// `siteUrl`; routes come from the shared content-path↔route mapping.

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function sitemapUrls(entries: CollectionEntry[], siteUrl: string): string[] {
  const base = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const urls = entries.map((entry) => {
    // Resolve the route relative to the base so a project-Pages path segment is
    // preserved; the root route ("/") resolves to the base itself.
    const route = contentPathToRoute(entry.path).replace(/^\//, "");
    return new URL(route, base).href;
  });
  return [...new Set(urls)].sort();
}

export function buildSitemap(entries: CollectionEntry[], siteUrl: string): string {
  const urls = sitemapUrls(entries, siteUrl)
    .map((loc) => `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function runSitemap(input: DeriveInput): DerivedArtifact[] {
  if (!input.siteUrl) return [];
  return [
    { path: "sitemap.xml", contents: buildSitemap(input.entries, input.siteUrl) },
  ];
}
