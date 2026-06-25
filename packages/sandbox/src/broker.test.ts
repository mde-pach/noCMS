import type { Capability } from "@nocms/core";
import { describe, expect, test, vi } from "vitest";
import { createBroker, type HostApi, METHOD_CAPABILITY } from "./broker.js";
import { type InvokeMessage, PROTOCOL } from "./protocol.js";

function invoke(method: string, params: unknown[] = [], id = 1): InvokeMessage {
  return { protocol: PROTOCOL, kind: "invoke", id, method, params };
}

function spyHost(): HostApi & { calls: () => Record<string, number> } {
  const counts: Record<string, number> = {};
  const tally = (name: string) => {
    counts[name] = (counts[name] ?? 0) + 1;
  };
  return {
    registerComponent: vi.fn(() => tally("registerComponent")),
    readContentModel: vi.fn(() => {
      tally("readContentModel");
      return { ok: true };
    }),
    contributeTokens: vi.fn(() => tally("contributeTokens")),
    contributeLayout: vi.fn(() => tally("contributeLayout")),
    calls: () => counts,
  };
}

const ALL: Capability[] = [
  "components:register",
  "content:read",
  "tokens:contribute",
  "layout:contribute",
];

describe("createBroker", () => {
  test("invokes a granted method and returns its value", async () => {
    const host = spyHost();
    const broker = createBroker(host, ["content:read"]);
    const res = await broker.handle(invoke("readContentModel", [], 7));
    expect(res).toEqual({
      protocol: PROTOCOL,
      kind: "result",
      id: 7,
      value: { ok: true },
    });
    expect(host.calls().readContentModel).toBe(1);
  });

  test("denies an ungranted method without calling the host", async () => {
    const host = spyHost();
    const broker = createBroker(host, ["content:read"]);
    const res = await broker.handle(invoke("contributeTokens", ["x"]));
    expect(res).toMatchObject({ kind: "error", code: "capability-denied", id: 1 });
    expect(host.calls().contributeTokens).toBeUndefined();
  });

  test("network is never a callable method even when granted", async () => {
    const host = spyHost();
    const broker = createBroker(host, ["network"]);
    const res = await broker.handle(invoke("network"));
    expect(res).toMatchObject({ kind: "error", code: "unknown-method" });
  });

  test("rejects prototype-chain names without reaching the host", async () => {
    const host = spyHost();
    const broker = createBroker(host, ALL);
    for (const name of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      const res = await broker.handle(invoke(name));
      expect(res).toMatchObject({ kind: "error", code: "unknown-method" });
    }
    expect(host.calls()).toEqual({});
  });

  test("reports a method the host does not implement as unknown", async () => {
    const broker = createBroker({ readContentModel: () => 1 }, ALL);
    const res = await broker.handle(invoke("contributeLayout", ["# hi"]));
    expect(res).toMatchObject({ kind: "error", code: "unknown-method" });
  });

  test("surfaces a host throw as host-error with the message, preserving id", async () => {
    const host: Partial<HostApi> = {
      readContentModel: () => {
        throw new Error("boom");
      },
    };
    const broker = createBroker(host, ["content:read"]);
    const res = await broker.handle(invoke("readContentModel", [], 99));
    expect(res).toEqual({
      protocol: PROTOCOL,
      kind: "error",
      id: 99,
      code: "host-error",
      message: "boom",
    });
  });

  test("awaits an async host method", async () => {
    const broker = createBroker({ readContentModel: async () => "deferred" }, [
      "content:read",
    ]);
    const res = await broker.handle(invoke("readContentModel"));
    expect(res).toMatchObject({ kind: "result", value: "deferred" });
  });

  test("ignores messages that are not invokes addressed to us", async () => {
    const broker = createBroker(spyHost(), ALL);
    for (const noise of [
      null,
      42,
      { kind: "invoke", id: 1, method: "x", params: [] },
      { protocol: PROTOCOL, kind: "result", id: 1, value: 0 },
      { protocol: PROTOCOL, kind: "invoke", method: "x", params: [] },
    ]) {
      expect(await broker.handle(noise)).toBeNull();
    }
  });

  test("the method→capability map covers every host method exactly", () => {
    expect(Object.keys(METHOD_CAPABILITY).sort()).toEqual([
      "contributeLayout",
      "contributeTokens",
      "readContentModel",
      "registerComponent",
    ]);
  });
});
