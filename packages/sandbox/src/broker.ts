// The capability broker — the security decision point. It dispatches a guest's
// invoke to the host API only when (a) the method is one of a fixed whitelist
// and (b) the owner granted that method's capability. Deny-by-default: an
// ungranted or unknown method never reaches the host. Pure given an injected
// host and grant set — no DOM, no port — so the protocol logic is testable on
// its own.

import type { Capability } from "@nocms/core";
import {
  type ErrorCode,
  type ErrorMessage,
  isInvokeMessage,
  PROTOCOL,
  type ResultMessage,
} from "./protocol.js";

/** The capability-scoped surface a plugin may reach — never the raw token. */
export interface HostApi {
  registerComponent(reg: unknown): void | Promise<void>;
  readContentModel(): unknown | Promise<unknown>;
  contributeTokens(flatTokenSource: string): void | Promise<void>;
  contributeLayout(mdx: string): void | Promise<void>;
}

export type HostMethod = keyof HostApi;

/** Each host method requires exactly one capability. `network` gates the frame, not a method. */
export const METHOD_CAPABILITY = {
  registerComponent: "components:register",
  readContentModel: "content:read",
  contributeTokens: "tokens:contribute",
  contributeLayout: "layout:contribute",
} as const satisfies Record<HostMethod, Capability>;

export interface Broker {
  /** Resolve a raw guest message to a response, or null if it is not ours. */
  handle(raw: unknown): Promise<ResultMessage | ErrorMessage | null>;
}

function fail(id: number, code: ErrorCode, message: string): ErrorMessage {
  return { protocol: PROTOCOL, kind: "error", id, code, message };
}

export function createBroker(
  host: Partial<HostApi>,
  granted: readonly Capability[],
): Broker {
  const grantedSet = new Set<Capability>(granted);
  return {
    async handle(raw) {
      if (!isInvokeMessage(raw)) return null;
      const { id, method, params } = raw;

      // hasOwn, never bracket-index by the untrusted name: `method` could be
      // "constructor"/"__proto__" and resolve up the prototype chain otherwise.
      if (!Object.hasOwn(METHOD_CAPABILITY, method)) {
        return fail(id, "unknown-method", `unknown method: ${method}`);
      }
      const name = method as HostMethod;
      const capability = METHOD_CAPABILITY[name];
      const fn = host[name];
      if (typeof fn !== "function") {
        return fail(id, "unknown-method", `host does not implement: ${method}`);
      }
      if (!grantedSet.has(capability)) {
        return fail(id, "capability-denied", `capability not granted: ${capability}`);
      }
      try {
        const value = await (fn as (...args: unknown[]) => unknown)(...params);
        return { protocol: PROTOCOL, kind: "result", id, value };
      } catch (err) {
        return fail(id, "host-error", err instanceof Error ? err.message : String(err));
      }
    },
  };
}
