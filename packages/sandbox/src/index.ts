// The plugin security boundary. Plugin UI runs in a sandboxed iframe and plugin
// logic in an isolated VM; neither gets the host DOM, the GitHub token, or
// network by default. The only channel is a capability-scoped postMessage API,
// and all repo writes go through the host, which holds the credential.

import type { Capability, PluginManifest } from "@nocms/core";

// Opaque until the host API firms up; validated by the host on receipt.
type ComponentRegistration = unknown;

/** The capability-scoped surface a plugin may call — never the raw token. */
export interface HostApi {
  registerComponent(reg: ComponentRegistration): void;
  readContentModel(): Promise<unknown>;
  contributeTokens(flatTokenSource: string): void;
  contributeLayout(mdx: string): void;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  /** capabilities the owner approved at install */
  granted: Capability[];
  dispose(): void;
}

export function loadPlugin(
  _manifest: PluginManifest,
  _host: Partial<HostApi>,
): Promise<LoadedPlugin> {
  throw new Error("not implemented: sandboxed plugin host");
}
