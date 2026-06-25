// The guest side of the protocol — what plugin code uses to call the host. It
// holds only a port; the GitHub token never crosses this boundary. Each call
// gets a correlation id and resolves when the matching result/error returns.

import type { HostApi } from "./broker.js";
import type { PortLike } from "./port.js";
import {
  type ErrorCode,
  isErrorMessage,
  isResultMessage,
  PROTOCOL,
} from "./protocol.js";

export class SandboxError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "SandboxError";
    this.code = code;
  }
}

/** Every host method, viewed from the guest, is async (it crosses a channel). */
export type RemoteHostApi = {
  [K in keyof HostApi]: (
    ...args: Parameters<HostApi[K]>
  ) => Promise<Awaited<ReturnType<HostApi[K]>>>;
};

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason: SandboxError) => void;
}

export function createHostClient(port: PortLike): RemoteHostApi & { dispose(): void } {
  const pending = new Map<number, Pending>();
  let nextId = 1;

  const listener = (event: { data: unknown }) => {
    const msg = event.data;
    if (isResultMessage(msg)) {
      pending.get(msg.id)?.resolve(msg.value);
      pending.delete(msg.id);
    } else if (isErrorMessage(msg)) {
      pending.get(msg.id)?.reject(new SandboxError(msg.code, msg.message));
      pending.delete(msg.id);
    }
  };
  port.addEventListener("message", listener);
  port.start?.();

  const invoke = (method: keyof HostApi, params: unknown[]) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      port.postMessage({ protocol: PROTOCOL, kind: "invoke", id, method, params });
    });

  return {
    registerComponent: (reg) => invoke("registerComponent", [reg]) as Promise<void>,
    readContentModel: () => invoke("readContentModel", []),
    contributeTokens: (src) => invoke("contributeTokens", [src]) as Promise<void>,
    contributeLayout: (mdx) => invoke("contributeLayout", [mdx]) as Promise<void>,
    dispose() {
      port.removeEventListener("message", listener);
      pending.clear();
    },
  };
}
