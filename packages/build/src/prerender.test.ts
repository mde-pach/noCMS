import { h } from "preact";
import { describe, expect, it } from "vitest";
import { type ComponentMap, prerenderRoutes } from "./index";

describe("prerenderRoutes", () => {
  it("renders each route to a full HTML document", async () => {
    const [home] = await prerenderRoutes([
      { path: "/", mdx: "# Home\n\nHello.", data: { title: "Home" } },
    ]);
    expect(home?.path).toBe("/");
    expect(home?.html).toContain("<!doctype html>");
    expect(home?.html).toContain("<title>Home</title>");
    expect(home?.html).toContain('<div id="app"><h1>Home</h1>');
  });

  it("injects CSS and maps components", async () => {
    const components: ComponentMap = {
      Box: (props) => h("div", { class: "box" }, props.children as never),
    };
    const [page] = await prerenderRoutes(
      [{ path: "/x", mdx: "<Box>inner</Box>", data: { title: "X" } }],
      { components, css: ":root{--c:red}" },
    );
    expect(page?.html).toContain("<style>:root{--c:red}</style>");
    expect(page?.html).toContain('<div class="box">inner</div>');
  });

  it("derives a title from data when no title fn is given", async () => {
    const [page] = await prerenderRoutes([
      { path: "/p", mdx: "x", data: { title: "From Data" } },
    ]);
    expect(page?.html).toContain("<title>From Data</title>");
  });
});
