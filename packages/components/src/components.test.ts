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
  Form,
  Grid,
  Hero,
  Image,
  Input,
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
    expect(html).toContain("btn-secondary");
    expect(html).toContain("Go");
  });
});

describe("layout primitives", () => {
  it("Container constrains width by variant", () => {
    const html = renderToString(h(Container, { width: "narrow", children: "x" }));
    expect(html).toContain("container-narrow");
    expect(html).toContain("40rem");
  });

  it("Section reflects tone and applies token padding", () => {
    const html = renderToString(
      h(Section, { tone: "muted", padding: "sm", children: "y" }),
    );
    expect(html).toContain("section-muted");
    expect(html).toContain("var(--space-sm)");
  });

  it("Grid renders the requested column count", () => {
    const html = renderToString(h(Grid, { columns: 3, children: "z" }));
    expect(html).toContain("repeat(3");
  });

  it("Stack aligns its children", () => {
    const html = renderToString(h(Stack, { align: "center", children: "s" }));
    expect(html).toContain("align-items:center");
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
    expect(html).toContain('class="card"');
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
    expect(html).toContain("var(--space-lg)");
  });

  it("Badge reflects its variant", () => {
    const html = renderToString(h(Badge, { variant: "new", children: "New" }));
    expect(html).toContain('data-variant="new"');
    expect(html).toContain("New");
  });
});

describe("form primitives", () => {
  it("Form posts to its action endpoint", () => {
    const html = renderToString(
      h(Form, { action: "https://forms.example/x", children: "f" }),
    );
    expect(html).toContain('action="https://forms.example/x"');
    expect(html).toContain('method="post"');
  });

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
      "Callout",
      "Card",
      "Container",
      "Counter",
      "Divider",
      "Form",
      "Grid",
      "Hero",
      "Image",
      "Input",
      "LanguageSwitcher",
      "LatestPosts",
      "Section",
      "Select",
      "Stack",
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
