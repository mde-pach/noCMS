/**
 * The flow that was broken: add a component from the library, then give it text.
 *
 * Every earlier test edited a component that ALREADY had text in the page, so none of
 * them exercised the state a component is in the moment it is added — no children at
 * all — which is exactly where the Text field went missing.
 */
import fs from "node:fs";
import { chromium } from "playwright";
import { startDevServer, stopDevServer } from "../scripts/dev-server.mjs";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = 41823;
const PAGE = "src/pages/index.astro";
const original = fs.readFileSync(PAGE, "utf-8");
const results = [];
const check = (n, ok, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${n}${extra ? `  — ${extra}` : ""}`);

await startDevServer(PORT);
const browser = await chromium.launch({ executablePath: CHROME });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  await page.goto(`http://localhost:${PORT}/edit/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.__nocms, { timeout: 20000 });
  const frame = () => page.frames().find((f) => f !== page.mainFrame());

  for (const [name, selector] of [
    ["button", ".nc-btn"],
    ["badge", ".dz-badge"],
  ]) {
    const before = (await frame().$$(selector)).length;
    await page
      .locator("#e-lib .ed-btn", { hasText: new RegExp(`^${name}`) })
      .first()
      .click();
    await page.waitForTimeout(1000);
    const after = await frame().$$(selector);
    check(
      `adding a ${name} adds one`,
      after.length === before + 1,
      `${before} -> ${after.length}`,
    );

    // It must not appear as nothing.
    const text = (await after[after.length - 1].textContent()).trim();
    check(
      `the added ${name} is visible, not empty`,
      text.length > 0,
      JSON.stringify(text),
    );

    // Selecting it must offer a Text field.
    await after[after.length - 1].click();
    await page.waitForTimeout(500);
    const labels = await page.$$eval("#e-panel .ed-field__name", (e) =>
      e.map((x) => x.textContent),
    );
    check(
      `the added ${name} offers a Text field`,
      labels.includes("Text"),
      labels.join(", "),
    );

    // And that field must actually change it.
    await page
      .locator("#e-panel .ed-field", { hasText: "Text" })
      .locator("input")
      .first()
      .fill(`Hello ${name}`);
    await page.waitForTimeout(800);
    const canvasText = (await frame().$$(selector)).at(-1);
    check(
      `typing into the ${name}'s Text field reaches the canvas`,
      (await canvasText.textContent()).trim() === `Hello ${name}`,
      (await canvasText.textContent()).trim(),
    );

    // And inline, with a real click and real keystrokes.
    await canvasText.click();
    await page.waitForTimeout(300);
    const caret = await frame().evaluate(
      () => document.activeElement?.hasAttribute?.("data-nocms-text") ?? false,
    );
    check(`the added ${name} can be typed into on the canvas`, caret);
    await page.keyboard.type("!");
    await page.waitForTimeout(600);
    check(
      `typing on the canvas changes the added ${name}`,
      (await (await frame().$$(selector)).at(-1).textContent()).includes("!"),
      (await (await frame().$$(selector)).at(-1).textContent()).trim(),
    );
  }

  // It survives a publish.
  await page.click("#e-save");
  await page.waitForTimeout(400);
  await page.click("#pub-go");
  await page.waitForTimeout(2500);
  const saved = fs.readFileSync(PAGE, "utf-8");
  const written = saved.match(/<(Button|Badge)\b[^>]*>([^<]*)<\/\1>/g) ?? [];
  const withText = written.filter((t) => t.includes("Hello"));
  check(
    "the added components are written with their text",
    withText.length === 2,
    written.join(" · ") || "no component with text found",
  );
} catch (err) {
  check(err.message.slice(0, 140), false);
} finally {
  console.log(results.join("\n"));
  await browser.close();
  stopDevServer();
  fs.writeFileSync(PAGE, original);
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
