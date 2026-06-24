import type { CollectionEntry, RepoPath } from "@nocms/core";
import { describe, expect, it } from "vitest";
import { buildBundles, buildTranslations, runI18n } from "./i18n";
import { deriveAll } from "./index";

const entry = (path: string, data: Record<string, unknown> = {}): CollectionEntry => ({
  collection: "pages",
  path: path as RepoPath,
  data,
  body: "",
});

const locales = ["en", "fr", "es"];

const entries = [
  entry("content/index.mdx", { title: "Home" }),
  entry("content/about.mdx", { title: "About" }),
  entry("content/fr/index.mdx", { title: "Accueil" }),
  entry("content/fr/about.mdx", { title: "À propos" }),
  entry("content/es/about.mdx", { title: "Acerca de" }),
  entry("content/posts/a.mdx", { title: "Post A" }),
];

describe("buildBundles", () => {
  it("groups entries by locale, default at root, others by directory", () => {
    const bundles = buildBundles(entries, locales);
    expect(bundles.map((b) => b.locale)).toEqual(["en", "fr", "es"]);

    const en = bundles.find((b) => b.locale === "en");
    expect(en?.entries.map((e) => e.route)).toEqual(["/", "/about", "/posts/a"]);

    const fr = bundles.find((b) => b.locale === "fr");
    expect(fr?.entries.map((e) => e.route)).toEqual(["/fr", "/fr/about"]);

    const es = bundles.find((b) => b.locale === "es");
    expect(es?.entries.map((e) => e.route)).toEqual(["/es/about"]);
  });

  it("computes a locale-independent key from the locale-stripped path", () => {
    const fr = buildBundles(entries, locales).find((b) => b.locale === "fr");
    const about = fr?.entries.find((e) => e.route === "/fr/about");
    expect(about?.key).toBe("/about");
    expect(about?.path).toBe("content/fr/about.mdx");
    expect(about?.data).toEqual({ title: "À propos" });
  });

  it("treats a non-locale first segment as default-locale content", () => {
    const en = buildBundles(entries, locales).find((b) => b.locale === "en");
    const post = en?.entries.find((e) => e.route === "/posts/a");
    expect(post?.key).toBe("/posts/a");
  });

  it("returns an empty bundle for a locale with no content", () => {
    const bundles = buildBundles([entry("content/about.mdx")], locales);
    expect(bundles.find((b) => b.locale === "fr")?.entries).toEqual([]);
  });
});

describe("buildTranslations", () => {
  it("links a page to its other-locale routes by shared key", () => {
    const manifest = buildTranslations(entries, locales);
    expect(manifest.defaultLocale).toBe("en");
    expect(manifest.locales).toEqual(locales);

    const about = manifest.groups.find((g) => g.key === "/about");
    expect(about?.translations).toEqual({
      en: "/about",
      fr: "/fr/about",
      es: "/es/about",
    });
  });

  it("omits locales that lack a translation", () => {
    const manifest = buildTranslations(entries, locales);
    const post = manifest.groups.find((g) => g.key === "/posts/a");
    expect(post?.translations).toEqual({ en: "/posts/a" });

    const home = manifest.groups.find((g) => g.key === "/");
    expect(home?.translations).toEqual({ en: "/", fr: "/fr" });
  });

  it("orders groups by key for deterministic output", () => {
    const keys = buildTranslations(entries, locales).groups.map((g) => g.key);
    expect(keys).toEqual([...keys].sort());
  });
});

describe("runI18n", () => {
  it("emits a bundle per locale plus the translations manifest", () => {
    const artifacts = runI18n({ entries, locales });
    expect(artifacts.map((a) => a.path)).toEqual([
      "i18n/en.json",
      "i18n/fr.json",
      "i18n/es.json",
      "i18n/translations.json",
    ]);
    for (const a of artifacts) expect(a.contents.endsWith("\n")).toBe(true);
  });

  it("is a no-op without at least two locales", () => {
    expect(runI18n({ entries })).toEqual([]);
    expect(runI18n({ entries, locales: [] })).toEqual([]);
    expect(runI18n({ entries, locales: ["en"] })).toEqual([]);
  });

  it("runs as part of deriveAll only when locales are configured", async () => {
    const without = await deriveAll({ entries });
    expect(without.some((a) => a.path.startsWith("i18n/"))).toBe(false);

    const withLocales = await deriveAll({ entries, locales });
    expect(withLocales.some((a) => a.path === "i18n/translations.json")).toBe(true);
  });
});
