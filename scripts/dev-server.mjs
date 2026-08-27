/** Astro 7 keeps a persistent dev server, so scripts must stop any existing one and
 *  stop their own on the way out — a plain SIGTERM does not reach the daemon. */
import { spawn, spawnSync } from "node:child_process";

export function stopDevServer() {
  spawnSync("npx", ["astro", "dev", "stop"], { stdio: "ignore" });
}

export async function startDevServer(port, timeoutMs = 45000) {
  stopDevServer();
  const proc = spawn("npx", ["astro", "dev", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = `http://localhost:${port}/`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return { proc, url };
    } catch {
      /* not up */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  stopDevServer();
  throw new Error(`dev server did not answer on ${url}`);
}
