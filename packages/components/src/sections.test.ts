import { type ControlDescriptor, deriveControls } from "@nocms/core";
import { type ComponentType, h } from "preact";
import { renderToString } from "preact-render-to-string";
import { describe, expect, test } from "vitest";
import {
  CTA,
  CTASchema,
  Features,
  FeaturesSchema,
  Footer,
  FooterSchema,
  HeroSection,
  HeroSectionSchema,
  Pricing,
  PricingSchema,
  registry,
  Stats,
  StatsSchema,
  Testimonials,
  TestimonialsSchema,
} from "./index";

const byKey = (schema: Parameters<typeof deriveControls>[0]) =>
  Object.fromEntries(deriveControls(schema).map((c) => [c.key, c]));

const child = (control: ControlDescriptor | undefined, key: string) =>
  control?.children?.find((c) => c.key === key);

// Render a section with no props — exercising its seed defaults. The `never` props
// dodge TS weak-type detection (all-optional props reject a bare `{}`).
const seed = (c: ComponentType<never>) => renderToString(h(c, {} as never));

describe("every registered block derives a non-empty panel (D9)", () => {
  test.each(Object.entries(registry))("%s carries a deriving schema", (_name, def) => {
    expect(def.schema).toBeDefined();
    if (def.schema) expect(deriveControls(def.schema).length).toBeGreaterThan(0);
  });
});

describe("meta-types map bare values to rich controls", () => {
  test("HeroSection: richtext title, url CTA, image, color-by-role background, select layout", () => {
    const c = byKey(HeroSectionSchema);
    expect(c.title?.kind).toBe("richtext");
    expect(c.primaryHref?.kind).toBe("url");
    expect(c.image?.kind).toBe("image");
    expect(c.layout?.kind).toBe("select");
    expect(c.layout?.config?.options).toEqual(["center", "left", "split"]);
    // `color` bound to token roles: a color control whose options are the roles.
    expect(c.background?.kind).toBe("color");
    expect(c.background?.config?.options).toContain("brand");
    expect(c.background?.default).toBe("page");
  });

  test("Features: columns is a range, items is a list of {icon,title,body}", () => {
    const c = byKey(FeaturesSchema);
    expect(c.columns?.kind).toBe("range");
    expect(c.columns?.config).toEqual({ min: 2, max: 4 });
    expect(c.items?.kind).toBe("list");
    const item = c.items?.children?.[0];
    expect(item?.kind).toBe("group");
    expect(child(item, "title")?.kind).toBe("text");
    expect(child(item, "body")?.kind).toBe("text");
  });

  test("Pricing tiers nest a features list and a url CTA", () => {
    const item = byKey(PricingSchema).tiers?.children?.[0];
    expect(item?.kind).toBe("group");
    expect(child(item, "ctaHref")?.kind).toBe("url");
    expect(child(item, "highlighted")?.kind).toBe("boolean");
    expect(child(item, "features")?.kind).toBe("list");
  });

  test("Testimonials quotes carry a richtext quote and image avatar", () => {
    const item = byKey(TestimonialsSchema).quotes?.children?.[0];
    expect(child(item, "quote")?.kind).toBe("richtext");
    expect(child(item, "avatar")?.kind).toBe("image");
  });

  test("CTA exposes a banner/boxed layout and color background", () => {
    const c = byKey(CTASchema);
    expect(c.layout?.config?.options).toEqual(["banner", "boxed"]);
    expect(c.background?.kind).toBe("color");
  });

  test("Footer columns nest a links list with url hrefs", () => {
    const column = byKey(FooterSchema).columns?.children?.[0];
    const links = child(column, "links");
    expect(links?.kind).toBe("list");
    expect(child(links?.children?.[0], "href")?.kind).toBe("url");
  });
});

describe("sections render finished seed content with no props", () => {
  test("HeroSection prerenders its seed headline and CTAs", () => {
    const html = seed(HeroSection);
    expect(html).toContain("Build a real website on GitHub");
    expect(html).toContain("Get started");
    expect(html).toContain("See how it works");
  });

  test("Features prerenders three seed cards", () => {
    const html = seed(Features);
    expect(html).toContain("The repo is the database");
    expect(html).toContain("Theme without a rebuild");
  });

  test("Pricing prerenders its seed tiers and highlights one", () => {
    const html = seed(Pricing);
    expect(html).toContain("Hobby");
    expect(html).toContain("Pro");
    expect(html).toContain("var(--color-brand-500)");
  });

  test("Testimonials prerenders seed quotes with attribution", () => {
    const html = seed(Testimonials);
    expect(html).toContain("Ada L.");
    expect(html).toContain("own every byte");
  });

  test("Stats prerenders its seed figures on the brand band", () => {
    const html = seed(Stats);
    expect(html).toContain("Monthly cost");
    expect(html).toContain("bg-brand-500"); // the brand band
  });

  test("CTA prerenders banner copy; boxed insets it on the page band", () => {
    expect(seed(CTA)).toContain("Ready to own your website?");
    const boxed = renderToString(h(CTA, { layout: "boxed" }));
    expect(boxed).toContain("Ready to own your website?");
  });

  test("Footer prerenders link columns and copyright", () => {
    const html = seed(Footer);
    expect(html).toContain("Product");
    expect(html).toContain("MIT licensed");
  });
});

describe("sections style only through tokens (no hardcoded hex)", () => {
  test.each([
    ["HeroSection", HeroSection],
    ["Features", Features],
    ["Pricing", Pricing],
    ["Testimonials", Testimonials],
    ["Stats", Stats],
    ["CTA", CTA],
    ["Footer", Footer],
  ] as const)("%s emits no raw hex colors", (_name, component) => {
    expect(seed(component)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
