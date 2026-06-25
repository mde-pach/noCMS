import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSiteConfig, parseSiteConfig, type SiteConfig } from "./site-config";

describe("parseSiteConfig", () => {
  it("defaults base to / and leaves the rest unset", () => {
    expect(parseSiteConfig({})).toEqual({ base: "/" });
  });

  it("parses a full config", () => {
    const input = {
      base: "/repo/",
      siteUrl: "https://owner.github.io/repo/",
      locales: ["en", "fr"],
      feed: { collections: ["posts"], title: "Site", description: "News" },
    };
    expect(parseSiteConfig(input)).toEqual<SiteConfig>(input);
  });

  it("rejects a non-URL siteUrl", () => {
    expect(() => parseSiteConfig({ siteUrl: "not a url" })).toThrow();
  });

  it("rejects an empty locales list", () => {
    expect(() => parseSiteConfig({ locales: [] })).toThrow();
  });

  it("rejects a feed without collections or title", () => {
    expect(() => parseSiteConfig({ feed: { collections: [], title: "x" } })).toThrow();
    expect(() =>
      parseSiteConfig({ feed: { collections: ["a"], title: "" } }),
    ).toThrow();
  });
});

describe("loadSiteConfig", () => {
  it("reads and validates nocms.config.json from the root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nocms-config-"));
    try {
      await writeFile(
        join(dir, "nocms.config.json"),
        JSON.stringify({ base: "/repo/", locales: ["en"] }),
      );
      expect(await loadSiteConfig(dir)).toEqual({ base: "/repo/", locales: ["en"] });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns the zero-config default when the file is absent", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nocms-config-"));
    try {
      expect(await loadSiteConfig(dir)).toEqual({ base: "/" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
