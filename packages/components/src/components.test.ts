import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { Button, Callout, Hero, registry } from "./index";

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

describe("registry", () => {
  it("exposes the primitives by tag name", () => {
    expect(Object.keys(registry).sort()).toEqual(["Button", "Callout", "Hero"]);
  });
});
