/**
 * Shared setup and teardown for tests that drive the editor against real files.
 *
 * Order matters and got this wrong once: the editor writes to the working tree, so the
 * browser and dev server must be shut down BEFORE files are restored. Restoring first
 * lets a late save clobber the restore, and the leaked state then breaks whatever runs
 * next — a failing image test left a page pointing at a deleted image, which made every
 * layout assertion fail for reasons that had nothing to do with layout.
 */
import fs from "node:fs";
import { stopDevServer } from "../scripts/dev-server.mjs";

/** Snapshot files now; call the returned function to put them back exactly. */
export function captureFiles(paths) {
  const originals = new Map(
    paths.map((p) => [p, fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null]),
  );
  return function restore() {
    for (const [p, content] of originals) {
      if (content === null) fs.rmSync(p, { force: true });
      else fs.writeFileSync(p, content);
    }
  };
}

/**
 * Shut everything down, then restore. Always in this order.
 * @returns the process exit code the suite should use
 */
export async function teardown({ browser, restore, results, alsoRemove = [] }) {
  console.log(results.join("\n"));
  try {
    await browser?.close();
  } catch {
    /* already gone */
  }
  stopDevServer();
  restore?.();
  for (const target of alsoRemove) fs.rmSync(target, { recursive: true, force: true });
  return results.some((r) => r.startsWith("FAIL")) ? 1 : 0;
}
