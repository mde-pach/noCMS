// Messages arrive from untrusted plugin code: every one is tagged with PROTOCOL
// so unrelated postMessage traffic on a shared channel is ignored, and so a
// guard can reject anything malformed before it reaches the broker.

import type { Capability } from "@nocms/core";

export const PROTOCOL = "nocms/sandbox@1";

export type ErrorCode = "capability-denied" | "unknown-method" | "host-error";

export interface ReadyMessage {
  protocol: typeof PROTOCOL;
  kind: "ready";
  capabilities: Capability[];
}

export interface InvokeMessage {
  protocol: typeof PROTOCOL;
  kind: "invoke";
  id: number;
  method: string;
  params: unknown[];
}

export interface ResultMessage {
  protocol: typeof PROTOCOL;
  kind: "result";
  id: number;
  value: unknown;
}

/** Never carries host internals — the guest sees only a code and a message. */
export interface ErrorMessage {
  protocol: typeof PROTOCOL;
  kind: "error";
  id: number;
  code: ErrorCode;
  message: string;
}

export type HostMessage = ReadyMessage | ResultMessage | ErrorMessage;
export type GuestMessage = InvokeMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTagged(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.protocol === PROTOCOL;
}

export function isInvokeMessage(value: unknown): value is InvokeMessage {
  return (
    isTagged(value) &&
    value.kind === "invoke" &&
    typeof value.id === "number" &&
    typeof value.method === "string" &&
    Array.isArray(value.params)
  );
}

export function isResultMessage(value: unknown): value is ResultMessage {
  return isTagged(value) && value.kind === "result" && typeof value.id === "number";
}

export function isErrorMessage(value: unknown): value is ErrorMessage {
  return (
    isTagged(value) &&
    value.kind === "error" &&
    typeof value.id === "number" &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}
