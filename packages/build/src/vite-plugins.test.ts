import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ISLAND_VIRTUAL_ID, islandClientEntry, nocmsVitePlugins } from "./index";

type Hook = (id: string) => string | undefined;

function findPlugin(name: string) {
  const plugin = nocmsVitePlugins().find((p) => p.name === name);
  if (!plugin) throw new Error(`no plugin named ${name}`);
  return plugin;
}

describe("nocmsVitePlugins", () => {
  it("includes the island client plugin", () => {
    expect(nocmsVitePlugins().map((p) => p.name)).toContain("nocms:island-client");
  });

  it("resolves and loads the island virtual module to the real entry", () => {
    const plugin = findPlugin("nocms:island-client");
    const resolve = plugin.resolveId as Hook;
    const load = plugin.load as Hook;

    const resolved = resolve.call({}, ISLAND_VIRTUAL_ID);
    expect(resolved).toBeDefined();
    expect(resolve.call({}, "some-other-id")).toBeUndefined();

    const code = load.call({}, resolved as string);
    expect(code).toContain(islandClientEntry());
    expect(load.call({}, "some-other-id")).toBeUndefined();
  });
});

describe("islandClientEntry", () => {
  it("points at an existing source file", () => {
    expect(existsSync(islandClientEntry())).toBe(true);
  });
});
