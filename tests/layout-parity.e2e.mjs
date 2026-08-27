/**
 * Layout parity: the canvas must not merely produce the same markup as the build, it
 * must LAY OUT the same.
 *
 * The editor injects markers so text can be edited in place. Markup parity strips them
 * before comparing, so it cannot see a marker that changes geometry — which is exactly
 * the kind of difference a person notices and a diff does not.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import { startDevServer, stopDevServer } from "../scripts/dev-server.mjs";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const EDITOR_PORT = 41817;
const SITE_PORT = 41818;
const WIDTH = 1000;
const results = [];
const check = (n, ok, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${n}${extra ? `  — ${extra}` : ""}`);

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const site = http.createServer((q, r) => {
  const rel =
    q.url === "/"
      ? "index.html"
      : decodeURIComponent(q.url.split("?")[0]).replace(/^\//, "");
  let file = path.resolve("dist", rel);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory())
    file = path.join(file, "index.html");
  if (!fs.existsSync(file)) {
    r.writeHead(404);
    return r.end("x");
  }
  r.writeHead(200, {
    "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
  });
  fs.createReadStream(file).pipe(r);
});
await new Promise((res) => site.listen(SITE_PORT, res));
await startDevServer(EDITOR_PORT);

/** Geometry of the things a person would notice moving. */
const MEASURE = [
  ".hero",
  ".hero .title",
  ".nav",
  ".dz-badge",
  ".nc-btn-ghost",
  ".grid-section",
  ".cta",
];
const measure = (sels) =>
  Object.fromEntries(
    sels.map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return [sel, null];
      const r = el.getBoundingClientRect();
      return [
        sel,
        [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      ];
    }),
  );

const browser = await chromium.launch({ executablePath: CHROME });
try {
  // The published page, at a fixed width.
  const sitePage = await browser.newPage({ viewport: { width: WIDTH, height: 900 } });
  await sitePage.goto(`http://localhost:${SITE_PORT}/`, { waitUntil: "networkidle" });
  const built = await sitePage.evaluate(measure, MEASURE);

  // The canvas, forced to the same width so the comparison is like-for-like.
  const editor = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  await editor.goto(`http://localhost:${EDITOR_PORT}/edit/`, {
    waitUntil: "networkidle",
  });
  await editor.waitForFunction(() => !!window.__nocms, { timeout: 20000 });
  await editor.evaluate((w) => {
    const frame = document.getElementById("nocms-canvas");
    // border-box plus the chrome's 1px border would make the content area narrower
    // than the page being compared against.
    frame.style.border = "0";
    frame.style.width = `${w}px`;
    frame.style.maxWidth = `${w}px`;
    frame.style.height = "3000px";
  }, WIDTH);
  await editor.waitForTimeout(900);
  const frame = editor.frames().find((f) => f !== editor.mainFrame());
  const canvas = await frame.evaluate(measure, MEASURE);

  const origin =
    built[".hero"] && canvas[".hero"] ? canvas[".hero"][1] - built[".hero"][1] : 0;
  for (const sel of MEASURE) {
    const a = built[sel];
    const b = canvas[sel];
    if (!a || !b) {
      check(`${sel} exists in both`, false, `built=${!!a} canvas=${!!b}`);
      continue;
    }
    // Compare size and horizontal position exactly; vertical position relative to the
    // first section, since the canvas has its own document origin.
    const same =
      a[0] === b[0] &&
      a[2] === b[2] &&
      a[3] === b[3] &&
      Math.abs(a[1] - (b[1] - origin)) <= 1;
    check(
      `${sel} lays out identically`,
      same,
      same ? "" : `built=${a.join(",")} canvas=${b.join(",")}`,
    );
  }
} catch (err) {
  check(err.message.slice(0, 140), false);
} finally {
  console.log(results.join("\n"));
  await browser.close();
  stopDevServer();
  site.close();
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
