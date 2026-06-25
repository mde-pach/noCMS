// @vitest-environment happy-dom

import type { Capability } from "@nocms/core";
import { describe, expect, test } from "vitest";
import { createSandboxFrame, frameSandboxPolicy, withCspMeta } from "./frame.js";

describe("frameSandboxPolicy", () => {
  test("never grants same-origin, so the realm stays null-origin", () => {
    for (const granted of [
      [],
      ["network"],
      ["content:read", "network"],
    ] as Capability[][]) {
      const { sandbox } = frameSandboxPolicy(granted);
      expect(sandbox).toContain("allow-scripts");
      expect(sandbox).not.toContain("allow-same-origin");
    }
  });

  test("denies network by default", () => {
    expect(frameSandboxPolicy([]).csp).toContain("connect-src 'none'");
    expect(frameSandboxPolicy(["content:read"]).csp).toContain("connect-src 'none'");
  });

  test("opens network only when the capability is granted", () => {
    const { csp } = frameSandboxPolicy(["network"]);
    expect(csp).toContain("connect-src https:");
    expect(csp).not.toContain("connect-src 'none'");
  });

  test("locks default-src to none", () => {
    expect(frameSandboxPolicy([]).csp).toContain("default-src 'none'");
  });
});

describe("createSandboxFrame", () => {
  test("stamps the policy onto the iframe element", () => {
    const policy = frameSandboxPolicy([]);
    const frame = createSandboxFrame(document, policy);
    expect(frame.tagName).toBe("IFRAME");
    expect(frame.getAttribute("sandbox")).toBe(policy.sandbox);
    expect(frame.getAttribute("csp")).toBe(policy.csp);
  });
});

describe("withCspMeta", () => {
  test("injects the meta into an existing head", () => {
    const out = withCspMeta(
      "<html><head><title>x</title></head></html>",
      "default-src 'none'",
    );
    expect(out).toContain('http-equiv="Content-Security-Policy"');
    expect(out.indexOf("Content-Security-Policy")).toBeLessThan(out.indexOf("<title>"));
  });

  test("prepends when there is no head", () => {
    const out = withCspMeta("<p>hi</p>", "default-src 'none'");
    expect(out.startsWith("<meta")).toBe(true);
  });
});
