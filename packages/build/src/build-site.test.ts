import type { SiteConfig } from "@nocms/core";
import { describe, expect, it } from "vitest";
import { normalizeBase, routeToFilePath, runtimeConfigMarkup } from "./build-site";

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

describe("runtimeConfigMarkup", () => {
  it("emits nothing for a plain site", () => {
    expect(runtimeConfigMarkup({ base: "/" }, "/")).toBe("");
  });

  it("emits the absolute feed link and a base-relative feed URL", () => {
    const config: SiteConfig = {
      base: "/repo/",
      siteUrl: "https://owner.github.io/repo/",
      feed: { collections: ["posts"], title: "Site" },
    };
    const out = runtimeConfigMarkup(config, "/repo/");
    expect(out).toContain(
      '<link rel="alternate" type="application/feed+json" href="https://owner.github.io/repo/feed.json"/>',
    );
    expect(out).toContain('"feedUrl":"/repo/feed.json"');
    expect(out).not.toContain("translationsUrl");
  });

  it("emits the translations URL only when ≥2 locales are declared", () => {
    expect(runtimeConfigMarkup({ base: "/", locales: ["en"] }, "/")).toBe("");
    const out = runtimeConfigMarkup({ base: "/", locales: ["en", "fr"] }, "/");
    expect(out).toContain('"translationsUrl":"/i18n/translations.json"');
    expect(out).toContain(`id="nocms-site"`);
  });

  it("escapes < so the embedded JSON cannot break out of the script", () => {
    const config: SiteConfig = { base: "/", locales: ["en", "fr"] };
    expect(runtimeConfigMarkup(config, "/")).not.toMatch(/<\/script.*nocms-site/);
  });
});
