import type { ControlDescriptor } from "@nocms/controls";
import { expect, test } from "vitest";
import {
  type ComponentPack,
  controlsOf,
  core,
  createRegistry,
  definePack,
  manifestOf,
  registry,
  registryManifest,
} from "./index";

const pack = (id: string, blocks: ComponentPack["blocks"]): ComponentPack =>
  definePack({ id, blocks });

const Dummy = () => null;

test("definePack rejects an empty id", () => {
  expect(() => definePack({ id: "", blocks: {} })).toThrow();
});

test("createRegistry merges packs; later packs override by name", () => {
  const a = pack("a", { X: { component: Dummy, category: "A" } });
  const b = pack("b", {
    Y: { component: Dummy },
    X: { component: Dummy, category: "B" },
  });
  const merged = createRegistry(a, b);
  expect(Object.keys(merged).sort()).toEqual(["X", "Y"]);
  expect(merged.X?.category).toBe("B");
});

test("the default registry is the core pack alone", () => {
  expect(Object.keys(registry).sort()).toEqual(Object.keys(core.blocks).sort());
});

test("manifestOf derives serializable controls + starter defaults from a schema", () => {
  const m = manifestOf("Button", core.blocks.Button!);
  expect(m.name).toBe("Button");
  expect(m.category).toBe("Content");
  expect(m.controls.map((c) => c.key)).toContain("variant");
  // required string with no schema default → label placeholder; select → first option.
  expect(m.defaults.label).toBe("Label");
  expect(m.defaults.variant).toBe("primary");
  expect(JSON.parse(JSON.stringify(m))).toEqual(m); // fully serializable
});

test("manifestOf tolerates a schema-less block", () => {
  const m = manifestOf("Bare", { component: () => null });
  expect(m.controls).toEqual([]);
  expect(m.defaults).toEqual({});
  expect(m.island).toBe(false);
});

test("controlsOf / manifestOf use pre-derived controls when a block has no schema", () => {
  const controls: ControlDescriptor[] = [
    { key: "headline", kind: "text", label: "Headline", required: true, default: "Hi" },
  ];
  const def = { component: Dummy, controls, category: "Plugin" };
  expect(controlsOf(def)).toBe(controls);
  const m = manifestOf("PluginCard", def);
  expect(m.controls).toEqual(controls);
  expect(m.defaults.headline).toBe("Hi");
});

test("registryManifest covers every block and flags islands", () => {
  const manifests = registryManifest(registry);
  expect(manifests).toHaveLength(Object.keys(registry).length);
  expect(manifests.find((m) => m.name === "Counter")?.island).toBe(true);
});
