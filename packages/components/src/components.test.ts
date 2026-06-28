import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import {
  Badge,
  Button,
  Callout,
  Card,
  Container,
  Counter,
  Divider,
  Frame,
  Grid,
  Hero,
  Image,
  Input,
  Navbar,
  registry,
  Section,
  Select,
  Stack,
  Textarea,
} from "./index";

describe("primitives", () => {
  it("Hero renders title and optional subtitle", () => {
    expect(renderToString(h(Hero, { title: "Welcome" }))).toContain("<h1");
    const withSub = renderToString(h(Hero, { title: "Welcome", subtitle: "hi" }));
    expect(withSub).toContain("Welcome");
    expect(withSub).toContain("hi");
  });

  it("Callout reflects its variant", () => {
    const html = renderToString(h(Callout, { variant: "warn", children: "careful" }));
    expect(html).toContain('data-variant="warn"');
    expect(html).toContain("careful");
  });

  it("Button renders an anchor with href and variant class", () => {
    const html = renderToString(
      h(Button, { label: "Go", href: "/x", variant: "secondary" }),
    );
    expect(html).toContain('href="/x"');
    expect(html).toContain("border-text/22"); // the secondary variant's outline
    expect(html).toContain("Go");
  });
});

describe("layout primitives", () => {
  it("Container constrains width by variant", () => {
    const html = renderToString(h(Container, { width: "narrow", children: "x" }));
    expect(html).toContain("max-w-[40rem]");
  });

  it("Section reflects tone and applies token padding", () => {
    const html = renderToString(
      h(Section, { tone: "muted", padding: "sm", children: "y" }),
    );
    expect(html).toContain("bg-text/4"); // muted tone
    expect(html).toContain("py-sm");
  });

  it("Grid renders the requested column count", () => {
    const html = renderToString(h(Grid, { columns: 3, children: "z" }));
    expect(html).toContain("grid-cols-3");
  });

  it("Stack aligns its children", () => {
    const html = renderToString(h(Stack, { align: "center", children: "s" }));
    expect(html).toContain("items-[center]");
  });

  it("Frame in row mode flows horizontally with the chosen alignment", () => {
    const html = renderToString(
      h(Frame, { direction: "row", align: "center", justify: "end", children: "f" }),
    );
    expect(html).toContain("flex-row");
    expect(html).toContain("items-center");
    expect(html).toContain("justify-end");
  });

  it("Frame in grid mode lays children into columns", () => {
    const html = renderToString(
      h(Frame, { direction: "grid", columns: 4, children: "g" }),
    );
    expect(html).toContain("grid-cols-4");
  });
});

describe("content & media primitives", () => {
  it("Card renders a link when href is given", () => {
    const html = renderToString(
      h(Card, { title: "Feature", href: "/f", children: "body" }),
    );
    expect(html).toContain('href="/f"');
    expect(html).toContain("Feature");
    expect(html).toContain("body");
  });

  it("Card renders a div when no href is given", () => {
    const html = renderToString(h(Card, { children: "plain" }));
    expect(html).toContain("border-text/12"); // the card's outline
    expect(html).not.toContain("<a");
  });

  it("Image renders src, alt and lazy loading", () => {
    const html = renderToString(
      h(Image, { src: "/cat.png", alt: "a cat", rounded: true }),
    );
    expect(html).toContain('src="/cat.png"');
    expect(html).toContain('alt="a cat"');
    expect(html).toContain('loading="lazy"');
  });

  it("Divider renders a rule with token spacing", () => {
    const html = renderToString(h(Divider, { spacing: "lg" }));
    expect(html).toContain("<hr");
    expect(html).toContain("my-lg");
  });

  it("Badge reflects its variant", () => {
    const html = renderToString(h(Badge, { variant: "new", children: "New" }));
    expect(html).toContain('data-variant="new"');
    expect(html).toContain("New");
  });
});

describe("field primitives", () => {
  it("Input renders a labelled field of the given type", () => {
    const html = renderToString(
      h(Input, { name: "email", label: "Email", type: "email" }),
    );
    expect(html).toContain('name="email"');
    expect(html).toContain('type="email"');
    expect(html).toContain("Email");
  });

  it("Textarea renders the requested rows", () => {
    const html = renderToString(h(Textarea, { name: "msg", rows: 6 }));
    expect(html).toContain('name="msg"');
    expect(html).toContain('rows="6"');
  });

  it("Select splits comma-separated options", () => {
    const html = renderToString(
      h(Select, { name: "size", options: "Small, Medium, Large" }),
    );
    expect(html).toContain('value="Small"');
    expect(html).toContain('value="Medium"');
    expect(html).toContain('value="Large"');
  });
});

describe("navigation", () => {
  it("Navbar renders its wordmark and link list", () => {
    const html = renderToString(
      h(Navbar, {
        brand: "no",
        brandMark: "CMS",
        links: [{ label: "Pricing", href: "#pricing" }],
        ctaLabel: "Fork",
        ctaHref: "/x",
      }),
    );
    expect(html).toContain("CMS");
    expect(html).toContain('href="#pricing"');
    expect(html).toContain("Pricing");
    expect(html).toContain("Fork");
  });
});

describe("interactive island", () => {
  it("Counter prerenders its label and starting count", () => {
    const html = renderToString(h(Counter, { label: "Votes", start: 3 }));
    expect(html).toContain("Votes: 3");
    expect(html).toContain("<button");
  });
});

describe("registry", () => {
  it("exposes every primitive by tag name", () => {
    expect(Object.keys(registry).sort()).toEqual([
      "Badge",
      "Button",
      "CTA",
      "Callout",
      "Card",
      "Container",
      "Counter",
      "Divider",
      "Features",
      "Footer",
      "Frame",
      "Grid",
      "Hero",
      "HeroSection",
      "Image",
      "Input",
      "LanguageSwitcher",
      "LatestPosts",
      "Navbar",
      "Pricing",
      "Section",
      "Select",
      "Stack",
      "Stats",
      "Testimonials",
      "Textarea",
    ]);
  });

  it("marks interactive consumers as islands and leaves static primitives unmarked", () => {
    expect(registry.Counter?.island).toBe(true);
    expect(registry.LanguageSwitcher?.island).toBe(true);
    expect(registry.LatestPosts?.island).toBe(true);
    expect(registry.Button?.island).toBeUndefined();
  });
});
