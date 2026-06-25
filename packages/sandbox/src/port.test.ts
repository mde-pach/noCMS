// @vitest-environment happy-dom

import type { Capability } from "@nocms/core";
import { describe, expect, test, vi } from "vitest";
import { createBroker, type HostApi } from "./broker.js";
import { createHostClient, SandboxError } from "./client.js";
import { serveBroker } from "./port.js";

const ALL: Capability[] = [
  "components:register",
  "content:read",
  "tokens:contribute",
  "layout:contribute",
];

/** Wire a broker to one channel end and a guest client to the other. */
function connect(host: Partial<HostApi>, granted: readonly Capability[]) {
  const channel = new MessageChannel();
  const detach = serveBroker(channel.port1, createBroker(host, granted));
  const client = createHostClient(channel.port2);
  return {
    client,
    dispose() {
      detach();
      client.dispose();
      channel.port1.close();
      channel.port2.close();
    },
  };
}

describe("broker ↔ client round trip", () => {
  test("a granted call resolves with the host value", async () => {
    const { client, dispose } = connect({ readContentModel: () => ({ pages: 3 }) }, [
      "content:read",
    ]);
    await expect(client.readContentModel()).resolves.toEqual({ pages: 3 });
    dispose();
  });

  test("an ungranted call rejects with a capability-denied SandboxError", async () => {
    const contributeTokens = vi.fn();
    const { client, dispose } = connect({ contributeTokens }, ["content:read"]);
    await expect(client.contributeTokens("x")).rejects.toMatchObject({
      name: "SandboxError",
      code: "capability-denied",
    });
    expect(contributeTokens).not.toHaveBeenCalled();
    dispose();
  });

  test("a host throw becomes a host-error rejection", async () => {
    const { client, dispose } = connect(
      {
        readContentModel: () => {
          throw new Error("nope");
        },
      },
      ["content:read"],
    );
    await expect(client.readContentModel()).rejects.toBeInstanceOf(SandboxError);
    dispose();
  });

  test("params cross the channel and correlate concurrent calls by id", async () => {
    const seen: string[] = [];
    const { client, dispose } = connect(
      {
        contributeTokens: async (src: string) => {
          seen.push(src);
        },
        contributeLayout: async (mdx: string) => {
          seen.push(mdx);
        },
      },
      ALL,
    );
    await Promise.all([
      client.contributeTokens("--brand: red"),
      client.contributeLayout("# Hi"),
    ]);
    expect(seen.sort()).toEqual(["# Hi", "--brand: red"]);
    dispose();
  });
});
