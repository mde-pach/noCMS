/** Picking an image: it is resized, converted, committed and placed — in one step. */
import fs from "node:fs";
import { chromium } from "playwright";
import { startDevServer } from "../scripts/dev-server.mjs";
import { captureFiles, teardown } from "./_fixture.mjs";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = 41773;
const PAGE = "src/pages/index.astro";
const results = [];
const check = (n, ok, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${n}${extra ? `  — ${extra}` : ""}`);

// A deliberately oversized PNG, as a phone would produce.
const BIG = "/tmp/nocms-big.png";
fs.rmSync("public/media", { recursive: true, force: true });

const restore = captureFiles([PAGE]);
await startDevServer(PORT);
const browser = await chromium.launch({ executablePath: CHROME });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  // Build a 4000x3000 PNG in the browser and save it, so the test input is real.
  await page.goto(`http://localhost:${PORT}/`);
  const png = await page.evaluate(async () => {
    const c = new OffscreenCanvas(4000, 3000);
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 4000, 3000);
    g.addColorStop(0, "#1f6f5e");
    g.addColorStop(1, "#b3123c");
    x.fillStyle = g;
    x.fillRect(0, 0, 4000, 3000);
    const blob = await c.convertToBlob({ type: "image/png" });
    const buf = new Uint8Array(await blob.arrayBuffer());
    return Array.from(buf);
  });
  fs.writeFileSync(BIG, Buffer.from(png));
  check(
    "test input is genuinely large",
    fs.statSync(BIG).size > 100_000,
    `${Math.round(fs.statSync(BIG).size / 1024)} KB, 4000x3000`,
  );

  await page.goto(`http://localhost:${PORT}/edit/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.__nocms, { timeout: 20000 });
  const frame = () => page.frames().find((f) => f !== page.mainFrame());

  await frame().click(".hero .title");
  await page.waitForTimeout(500);
  const field = page.locator("#e-panel .ed-field", { hasText: "Image" }).first();
  check("sections can declare an image field", await field.isVisible());

  await field.locator('input[type="file"]').setInputFiles(BIG);
  await page.waitForTimeout(6000);

  const written = fs.existsSync("public/media") ? fs.readdirSync("public/media") : [];
  check(
    "the image is committed on choosing it",
    written.length === 1,
    written.join(", "),
  );
  const name = written[0] ?? "";
  check("it is converted to webp", name.endsWith(".webp"), name);

  const bytes = name ? fs.statSync(`public/media/${name}`).size : 0;
  check(
    "it is smaller than what went in",
    bytes > 0 && bytes < fs.statSync(BIG).size,
    `${Math.round(bytes / 1024)} KB from ${Math.round(fs.statSync(BIG).size / 1024)} KB`,
  );

  const dims = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    return { w: img.naturalWidth, h: img.naturalHeight };
  }, `/media/${name}`);
  check(
    "the long edge is capped",
    dims.w <= 2560 && dims.h <= 2560,
    `${dims.w}x${dims.h}`,
  );

  check("it appears on the page", (await frame().$$(".hero .shot")).length === 1);

  await page.click("#e-save");
  await page.waitForTimeout(400);
  await page.click("#pub-go");
  await page.waitForTimeout(2500);
  const saved = fs.readFileSync(PAGE, "utf-8");
  check(
    "the page references it",
    /image="\/media\/[^"]+\.webp"/.test(saved),
    saved.match(/image="[^"]*"/)?.[0] ?? "not referenced",
  );
} catch (err) {
  check(err.message.slice(0, 140), false);
} finally {
  process.exit(
    await teardown({ browser, restore, results, alsoRemove: ["public/media", BIG] }),
  );
}
