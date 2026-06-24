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

describe("island prerendering", () => {
  const components: ComponentMap = {
    Widget: (props) => h("button", null, props.children as never),
    Box: (props) => h("div", { class: "box" }, props.children as never),
  };

  it("wraps island roots in a marker and reports them in the per-page manifest", async () => {
    const [page] = await prerenderRoutes(
      [{ path: "/", mdx: "<Widget>go</Widget>", data: { title: "I" } }],
      { components, islands: ["Widget"], islandClientSrc: "/_nocms/islands.js" },
    );
    expect(page?.html).toContain('data-island="Widget"');
    expect(page?.html).toContain("<button>go</button>");
    expect(page?.html).toContain(
      '<script type="module" src="/_nocms/islands.js"></script>',
    );
    expect(page?.islands).toEqual(["Widget"]);
  });

  it("leaves island-free pages byte-identical and script-free", async () => {
    const route = { path: "/", mdx: "<Box>plain</Box>", data: { title: "S" } };
    const [withIslands] = await prerenderRoutes([route], {
      components,
      islands: ["Widget"],
      islandClientSrc: "/_nocms/islands.js",
    });
    const [staticOnly] = await prerenderRoutes([route], { components });
    expect(withIslands?.html).toBe(staticOnly?.html);
    expect(withIslands?.islands).toEqual([]);
    expect(withIslands?.html).not.toContain("<script");
    expect(withIslands?.html).not.toContain("data-island");
  });

  it("omits the script when no client src is configured", async () => {
    const [page] = await prerenderRoutes(
      [{ path: "/", mdx: "<Widget>go</Widget>", data: { title: "I" } }],
      { components, islands: ["Widget"] },
    );
    expect(page?.html).toContain('data-island="Widget"');
    expect(page?.html).not.toContain("<script");
    expect(page?.islands).toEqual(["Widget"]);
  });
});
