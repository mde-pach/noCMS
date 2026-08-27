/** Search is build-time and client-side: no server, no key, nothing to operate. */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = 41795;
const results = [];
const check = (n, ok, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${n}${extra ? `  — ${extra}` : ""}`);

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".pf_fragment": "application/octet-stream",
  ".pf_index": "application/octet-stream",
  ".pf_meta": "application/octet-stream",
  ".wasm": "application/wasm",
};
const server = http.createServer((q, r) => {
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
await new Promise((res) => server.listen(PORT, res));

const browser = await chromium.launch({ executablePath: CHROME });
try {
  check(
    "an index is produced at build time",
    fs.existsSync("dist/pagefind/pagefind.js"),
  );
  check(
    "the editor route is excluded from it",
    fs
      .readFileSync("dist/edit/index.html", "utf-8")
      .includes('data-pagefind-ignore="all"'),
  );

  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
  const found = await page.evaluate(async () => {
    const pf = await import("/pagefind/pagefind.js");
    await pf.init();
    const r = await pf.search("clicking");
    const first = r.results[0] ? await r.results[0].data() : null;
    return { count: r.results.length, url: first?.url ?? null };
  });
  check(
    "a visitor can search with no server at all",
    found.count > 0,
    `${found.count} result(s) for "clicking"`,
  );
  check("results point at real pages", found.url === "/", found.url ?? "none");

  // Assert on URLs: a phrase search matches loosely, so "noCMS" alone proves nothing.
  const urls = await page.evaluate(async () => {
    const pf = await import("/pagefind/pagefind.js");
    await pf.init();
    const seen = [];
    for (const term of ["noCMS", "edit", "search"]) {
      const r = await pf.search(term);
      for (const hit of r.results) seen.push((await hit.data()).url);
    }
    return seen;
  });
  check(
    "the editor route never appears in results",
    !urls.some((u) => u.startsWith("/edit")),
    [...new Set(urls)].join(", ") || "no results",
  );
} catch (err) {
  check(err.message.slice(0, 140), false);
} finally {
  console.log(results.join("\n"));
  await browser.close();
  server.close();
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
