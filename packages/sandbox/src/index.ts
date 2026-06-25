// The plugin security boundary (invariant #8). Plugin code runs in a sandboxed,
// null-origin iframe and reaches the host only through a capability-scoped
// postMessage broker over a transferred MessagePort. It never receives the
// GitHub token, the host DOM, or — by default — the network. v1 is iframe-only;
// QuickJS-in-WASM is a documented defense-in-depth escalation (DECISIONS.md D4).

import type { Capability, PluginManifest } from "@nocms/core";
import { createBroker, type HostApi } from "./broker.js";
import { createSandboxFrame, frameSandboxPolicy } from "./frame.js";
import { serveBroker } from "./port.js";
import { PROTOCOL } from "./protocol.js";

export type { HostApi, HostMethod } from "./broker.js";
export { createBroker, METHOD_CAPABILITY } from "./broker.js";
export { createHostClient, type RemoteHostApi, SandboxError } from "./client.js";
export { frameSandboxPolicy, type SandboxPolicy } from "./frame.js";
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
  /** Where to attach the frame. Defaults to `document.body`. */
  mount?: HTMLElement;
  /** Injected for testing; defaults to the ambient `document`. */
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
  const frame = createSandboxFrame(doc, frameSandboxPolicy(granted));
  (options.mount ?? doc.body).appendChild(frame);

  const channel = new MessageChannel();
  const detach = serveBroker(channel.port1, createBroker(host, granted));

  // Hand the guest its end of the channel and its grant once the frame loads.
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
