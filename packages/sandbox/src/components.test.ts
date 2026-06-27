import { core, createRegistry } from "@nocms/components";
import type { VNode } from "preact";
import { expect, test } from "vitest";
import { createBroker } from "./broker.js";
import {
  createComponentRegistrar,
  escapeHtml,
  fillTemplate,
  validateRegistration,
} from "./components.js";
import { PROTOCOL } from "./protocol.js";

const validReg = {
  name: "Promo",
  template: "<div>{{headline}}</div>",
  category: "Marketing",
  controls: [
    { key: "headline", kind: "text", label: "Headline", required: true, default: "Hi" },
  ],
};

test("escapeHtml neutralizes markup", () => {
  expect(escapeHtml(`<b>"x"&'`)).toBe("&lt;b&gt;&quot;x&quot;&amp;&#39;");
});

test("fillTemplate interpolates and escapes; missing keys become empty", () => {
  const out = fillTemplate("<h1>{{title}}</h1><p>{{missing}}</p>", {
    title: "<script>alert(1)</script>",
  });
  expect(out).toContain("&lt;script&gt;");
  expect(out).not.toContain("<script>");
  expect(out).toContain("<p></p>");
});

test("validateRegistration rejects a bad name or missing template", () => {
  expect(() => validateRegistration({ name: "lowercase", template: "x" })).toThrow();
  expect(() => validateRegistration({ name: "Ok" })).toThrow();
  expect(() => validateRegistration("nope")).toThrow();
});

test("validateRegistration keeps well-formed controls and drops malformed ones", () => {
  const reg = validateRegistration({
    name: "Widget",
    template: "<i/>",
    controls: [{ key: "a", kind: "text", label: "A", required: true }, { nope: true }],
  });
  expect(reg.controls).toHaveLength(1);
  expect(reg.controls?.[0]?.key).toBe("a");
});

test("a granted registerComponent flows through the broker into a composable pack", async () => {
  const registrar = createComponentRegistrar();
  let notified = 0;
  registrar.subscribe(() => {
    notified++;
  });
  const broker = createBroker({ registerComponent: registrar.registerComponent }, [
    "components:register",
  ]);

  const res = await broker.handle({
    protocol: PROTOCOL,
    kind: "invoke",
    id: 1,
    method: "registerComponent",
    params: [validReg],
  });
  expect(res?.kind).toBe("result");
  expect(notified).toBe(1);

  const composed = createRegistry(core, registrar.pack());
  expect(composed.Promo).toBeDefined();
  expect(composed.Button).toBeDefined(); // core still present

  const manifest = registrar.manifests()[0];
  expect(manifest?.name).toBe("Promo");
  expect(manifest?.category).toBe("Marketing");
  expect(manifest?.defaults.headline).toBe("Hi");
});

test("the render proxy is an inert sandboxed iframe with escaped props", () => {
  const registrar = createComponentRegistrar();
  registrar.registerComponent(validReg);
  const def = registrar.pack().blocks.Promo;
  const render = def?.component as (p: Record<string, unknown>) => VNode;
  const props = render({ headline: "<b>hey</b>" }).props as Record<string, unknown>;
  expect(props.sandbox).toBe("");
  expect(String(props.srcdoc)).toContain("&lt;b&gt;hey&lt;/b&gt;");
});

test("an ungranted registerComponent is denied and registers nothing", async () => {
  const registrar = createComponentRegistrar();
  const broker = createBroker({ registerComponent: registrar.registerComponent }, []);
  const res = await broker.handle({
    protocol: PROTOCOL,
    kind: "invoke",
    id: 1,
    method: "registerComponent",
    params: [validReg],
  });
  expect(res?.kind).toBe("error");
  expect(Object.keys(registrar.pack().blocks)).toHaveLength(0);
});
