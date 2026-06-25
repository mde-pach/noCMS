// The seam between the pure broker and a real channel. Any MessagePort-like
// object works (a transferred MessagePort in production, a MessageChannel port
// under test), so the wiring is exercisable without an iframe.

import type { Broker } from "./broker.js";

export interface PortLike {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  removeEventListener(
    type: "message",
    listener: (event: { data: unknown }) => void,
  ): void;
  start?(): void;
  close?(): void;
}

/** Attach a broker to a port; returns a detach function. */
export function serveBroker(port: PortLike, broker: Broker): () => void {
  const listener = (event: { data: unknown }) => {
    void broker.handle(event.data).then((response) => {
      if (response) port.postMessage(response);
    });
  };
  port.addEventListener("message", listener);
  port.start?.();
  return () => port.removeEventListener("message", listener);
}
