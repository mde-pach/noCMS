/** Creating a page, switching to it, filling it, and confirming it serves at its URL. */
import fs from "node:fs";
import { chromium } from "playwright";
import { startDevServer, stopDevServer } from "../scripts/dev-server.mjs";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = 41768;
const NEW = "src/pages/about/index.astro";
const results = [];
const check = (n, ok, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${n}${extra ? `  — ${extra}` : ""}`);

fs.rmSync("src/pages/about", { recursive: true, force: true });
await startDevServer(PORT);
const browser = await chromium.launch({ executablePath: CHROME });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  page.on("dialog", (d) => d.accept("/about"));
  await page.goto(`http://localhost:${PORT}/edit/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.__nocms, { timeout: 20000 });

  await page.click("#e-new-page");
  await page.waitForTimeout(2500);
  await page
    .waitForFunction(() => !!window.__nocms, { timeout: 15000 })
    .catch(() => {});

  check("the page file is created", fs.existsSync(NEW));
  const created = fs.existsSync(NEW) ? fs.readFileSync(NEW, "utf-8") : "";
  check(
    "it imports the layout at the right depth",
    created.includes("'../../layouts/Site.astro'"),
    created.split("\n")[1] ?? "",
  );

  const routes = await page.$$eval("#e-pages option", (o) =>
    o.map((x) => x.textContent),
  );
  check(
    "the new page appears in the switcher",
    routes.includes("/about/"),
    routes.join(", "),
  );

  // Fill it from the section library, then publish.
  await page.selectOption("#e-pages", NEW).catch(() => {});
  await page.waitForTimeout(1200);
  await page.locator("#e-lib .ed-btn", { hasText: "Hero" }).click();
  await page.waitForTimeout(1000);
  const frame = () => page.frames().find((f) => f !== page.mainFrame());
  check(
    "a section can be added to a brand new page",
    (await frame().$$("section.hero")).length === 1,
  );

  await page.click("#e-save");
  await page.waitForTimeout(400);
  await page.click("#pub-go");
  await page.waitForTimeout(2500);
  const saved = fs.readFileSync(NEW, "utf-8");
  check("the section is written into the new page", saved.includes("<Hero"));
  check("its import is written too", saved.includes("import Hero from"));

  // The real proof: Astro serves it at the URL the owner chose.
  const res = await page.request.get(`http://localhost:${PORT}/about/`);
  check("the new page serves at its URL", res.status() === 200, `HTTP ${res.status()}`);
  const html = await res.text();
  check("and renders the section", /class="hero"/.test(html));
} catch (err) {
  check(err.message.slice(0, 140), false);
} finally {
  console.log(results.join("\n"));
  await browser.close();
  stopDevServer();
  fs.rmSync("src/pages/about", { recursive: true, force: true });
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
