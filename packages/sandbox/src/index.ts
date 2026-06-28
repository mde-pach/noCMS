// The plugin security boundary: plugin code runs in a sandboxed, null-origin
// iframe and reaches the host only through a capability-scoped postMessage
// broker over a transferred MessagePort — never the GitHub token, the host DOM,
// or (by default) the network. v1 is iframe-only; QuickJS-in-WASM is a possible
// defense-in-depth escalation.

import type { Capability, PluginManifest } from "@nocms/core";
import { createBroker, type HostApi } from "./broker.js";
import { createSandboxFrame, frameSandboxPolicy, withCspMeta } from "./frame.js";
import { serveBroker } from "./port.js";
import { PROTOCOL } from "./protocol.js";

export type { HostApi, HostMethod } from "./broker.js";
export { createBroker, METHOD_CAPABILITY } from "./broker.js";
export { createHostClient, type RemoteHostApi, SandboxError } from "./client.js";
export {
  blockFromRegistration,
  type ComponentRegistrar,
  type ComponentRegistrarOptions,
  createComponentRegistrar,
  escapeHtml,
  fillTemplate,
  type PluginComponentRegistration,
  validateRegistration,
} from "./components.js";
export {
  createSandboxFrame,
  frameSandboxPolicy,
  type SandboxPolicy,
  withCspMeta,
} from "./frame.js";
export type { PortLike } from "./port.js";
export { serveBroker } from "./port.js";
export {
  type ErrorCode,
  type HostMessage,
  type InvokeMessage,
  PROTOCOL,
} from "./protocol.js";

export interface LoadPluginOptions {
  /**
   * Capabilities the owner approved at install. The effective grant is the
   * intersection with what the manifest requests — deny-by-default. Defaults to
   * the manifest's full request when omitted (dev convenience).
   */
  grant?: Capability[];
  /**
   * Guest document HTML loaded into the frame as `srcdoc`. The frame's CSP is
   * injected at the top of it (`withCspMeta`), so network denial applies to the
   * document itself. Omit to leave the frame empty (the host posts the port on
   * load regardless, but nothing receives it).
   */
  source?: string;
  mount?: HTMLElement;
  document?: Document;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  /** Capabilities actually in force — what the owner granted ∩ what was requested. */
  granted: Capability[];
  frame: HTMLIFrameElement;
  dispose(): void;
}

export function loadPlugin(
  manifest: PluginManifest,
  host: Partial<HostApi>,
  options: LoadPluginOptions = {},
): LoadedPlugin {
  const requested = manifest.capabilities;
  const approved = options.grant ?? requested;
  const granted = requested.filter((cap) => approved.includes(cap));

  const doc = options.document ?? document;
  const policy = frameSandboxPolicy(granted);
  const frame = createSandboxFrame(doc, policy);
  if (options.source !== undefined) {
    frame.setAttribute("srcdoc", withCspMeta(options.source, policy.csp));
  }
  (options.mount ?? doc.body).appendChild(frame);

  const channel = new MessageChannel();
  const detach = serveBroker(channel.port1, createBroker(host, granted));

  const onLoad = () => {
    frame.contentWindow?.postMessage(
      { protocol: PROTOCOL, kind: "ready", capabilities: granted },
      "*",
      [channel.port2],
    );
  };
  frame.addEventListener("load", onLoad);

  return {
    manifest,
    granted,
    frame,
    dispose() {
      frame.removeEventListener("load", onLoad);
      detach();
      channel.port1.close();
      frame.remove();
    },
  };
}
