/**
 * The parity gate.
 *
 * Renders each page through the REAL editor bundle in a browser and compares it with
 * what `astro build` produced. If they diverge, the publish fails with a plain message
 * instead of shipping a site that looks different from what the owner was shown.
 *
 * This is what makes the pinned, still-experimental container API safe to depend on:
 * a bad Astro bump breaks the build loudly rather than the site quietly.
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { startDevServer, stopDevServer } from "./dev-server.mjs";

const CHROME =
  process.env.NOCMS_CHROME ??
  process.env.HOME +
    "/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const PORT = Number(process.env.NOCMS_GATE_PORT ?? 41837);

/**
 * The editor wraps each addressable component in a marker so the overlay can map a DOM
 * rect back to a node. Those wrappers are display:contents and carry no styling, so
 * they are stripped before comparing. Matched by attribute, not by exact shape — the
 * marker has gained attributes before and silently broke this comparison.
 */
const WRAPPER_OPEN = /<div\s[^>]*\bdata-nocms-path="[^"]*"[^>]*>/g;

function unwrap(html) {
  let out = "";
  let i = 0;
  while (i < html.length) {
    WRAPPER_OPEN.lastIndex = i;
    const m = WRAPPER_OPEN.exec(html);
    if (!m || m.index !== i) {
      out += html[i];
      i++;
      continue;
    }
    i = m.index + m[0].length;
    let depth = 1;
    let j = i;
    while (j < html.length && depth > 0) {
      if (html.startsWith("<div", j)) depth++;
      else if (html.startsWith("</div>", j)) depth--;
      if (depth === 0) break;
      j++;
    }
    out += unwrap(html.slice(i, j));
    i = j + "</div>".length;
  }
  return out;
}

/** Differences that are deterministic and not semantic. */
const normalise = (html) => html.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();

const pages = [{ route: "/", dist: "dist/index.html" }];

await startDevServer(PORT);

const browser = await chromium.launch({ executablePath: CHROME });
const failures = [];
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/edit/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.__nocms, { timeout: 20000 });

  for (const target of pages) {
    // Compare body-to-body. Head differs legitimately: the build links hashed asset
    // bundles the editor has no equivalent for. Section markup is what must match.
    const bodyOf = (html) => {
      const open = html.indexOf("<body");
      if (open === -1) return html;
      return html.slice(html.indexOf(">", open) + 1, html.lastIndexOf("</body>"));
    };
    const editorHtml = unwrap(
      bodyOf(await page.evaluate(() => window.__nocms.renderTree())),
    );
    const built = fs.readFileSync(path.resolve(target.dist), "utf-8");
    const body = bodyOf(built);

    if (normalise(editorHtml) !== normalise(body)) {
      const a = normalise(editorHtml),
        b = normalise(body);
      let at = 0;
      while (at < Math.max(a.length, b.length) && a[at] === b[at]) at++;
      failures.push(
        [
          `  ${target.route}`,
          `    editor : …${a.slice(Math.max(0, at - 60), at + 90)}`,
          `    built  : …${b.slice(Math.max(0, at - 60), at + 90)}`,
        ].join("\n"),
      );
    }
  }
} finally {
  await browser.close();
  stopDevServer();
}

if (failures.length) {
  console.error(
    "\nPARITY GATE FAILED — the editor and the published page would disagree.\n",
  );
  console.error(failures.join("\n\n"));
  console.error(
    "\nThis usually means the Astro version changed. The pin in package.json exists",
  );
  console.error("for exactly this reason; see docs/ARCHITECTURE.md.\n");
  process.exit(1);
}
console.log(`parity gate: ${pages.length} page(s) match the build`);
