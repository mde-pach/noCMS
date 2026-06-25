// @vitest-environment happy-dom

import type { PluginManifest } from "@nocms/core";
import { describe, expect, test } from "vitest";
import { loadPlugin } from "./index.js";

function manifest(capabilities: PluginManifest["capabilities"]): PluginManifest {
  return { name: "demo", version: "1.0.0", integrity: "sha256-x", capabilities };
}

describe("loadPlugin", () => {
  test("attaches a sandboxed frame and removes it on dispose", () => {
    const plugin = loadPlugin(manifest(["content:read"]), {});
    expect(plugin.frame.isConnected).toBe(true);
    expect(plugin.frame.getAttribute("sandbox")).toBe("allow-scripts");
    plugin.dispose();
    expect(plugin.frame.isConnected).toBe(false);
  });

  test("the effective grant is the owner approval ∩ the manifest request", () => {
    const plugin = loadPlugin(
      manifest(["content:read", "network"]),
      {},
      {
        grant: ["content:read", "tokens:contribute"],
      },
    );
    expect(plugin.granted).toEqual(["content:read"]);
    plugin.dispose();
  });

  test("an unapproved network request is dropped, so the frame denies network", () => {
    const plugin = loadPlugin(manifest(["network"]), {}, { grant: [] });
    expect(plugin.granted).toEqual([]);
    expect(plugin.frame.getAttribute("csp")).toContain("connect-src 'none'");
    plugin.dispose();
  });

  test("loads guest source into srcdoc with the CSP injected", () => {
    const plugin = loadPlugin(
      manifest([]),
      {},
      { source: "<head></head><body>hi</body>" },
    );
    const srcdoc = plugin.frame.getAttribute("srcdoc") ?? "";
    expect(srcdoc).toContain("hi");
    expect(srcdoc).toContain('http-equiv="Content-Security-Policy"');
    expect(srcdoc).toContain("connect-src 'none'");
    plugin.dispose();
  });

  test("leaves srcdoc unset when no source is given", () => {
    const plugin = loadPlugin(manifest([]), {});
    expect(plugin.frame.hasAttribute("srcdoc")).toBe(false);
    plugin.dispose();
  });

  test("mounts into a provided target", () => {
    const mount = document.createElement("div");
    document.body.appendChild(mount);
    const plugin = loadPlugin(manifest([]), {}, { mount });
    expect(plugin.frame.parentElement).toBe(mount);
    plugin.dispose();
  });
});
