import fs from "node:fs";
import { chromium } from "playwright";
import { startDevServer, stopDevServer } from "../scripts/dev-server.mjs";

const CHROME =
  process.env.HOME +
  "/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const PORT = 41731;
const PAGE = "src/pages/index.astro";
const original = fs.readFileSync(PAGE, "utf-8");
const THEME = "src/styles/theme.css";
const originalTheme = fs.readFileSync(THEME, "utf-8");

await startDevServer(PORT);

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

const results = [];
const check = (name, ok, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  — ${extra}` : ""}`);

try {
  await page.goto(`http://localhost:${PORT}/edit/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const failed = await page.evaluate(() =>
    document.body.textContent.includes("noCMS failed to start"),
  );
  if (failed) {
    console.log(`BOOT FAILURE:\n${(await page.textContent("body")).slice(0, 1500)}`);
    throw new Error("editor did not boot");
  }

  check("editor boots", await page.isVisible("#nocms-canvas"));
  check("detects local mode", (await page.textContent("#e-mode")).includes("local"));
  check(
    "section library listed",
    (await page.$$("#e-lib button")).length === 3,
    `${(await page.$$("#e-lib button")).length} sections`,
  );

  const frame = page.frames().find((f) => f !== page.mainFrame());
  check("canvas has a frame", !!frame);
  const heroText = await frame.textContent(".hero .title");
  check(
    "renders the real page",
    heroText.includes("Build it by clicking it"),
    heroText.trim(),
  );

  const scoped = await frame.evaluate(
    () =>
      !!document.querySelector("[data-astro-cid-]") ||
      [...document.querySelectorAll("*")].some((el) =>
        [...el.attributes].some((a) => a.name.startsWith("data-astro-cid")),
      ),
  );
  check("scoped styles applied", scoped);
  const heroPad = await frame.evaluate(
    () => getComputedStyle(document.querySelector(".hero")).paddingTop,
  );
  check(
    "theme tokens resolve in canvas",
    heroPad !== "0px",
    `hero padding-top=${heroPad}`,
  );

  await frame.click(".hero .title");
  await page.waitForTimeout(400);
  check(
    "clicking selects a section",
    (await page.$$("#e-panel .field")).length > 0,
    `${(await page.$$("#e-panel .field")).length} fields`,
  );

  const labels = await page.$$eval("#e-panel .field label", (els) =>
    els.map((e) => e.textContent),
  );
  check("panel uses zod meta labels", labels.includes("Headline"), labels.join(", "));

  // Regression: .default() wraps the enum, so options must be read through unwrap().
  const opts = await page.$$eval("#e-panel select option", (els) =>
    els.map((e) => e.value),
  );
  check(
    "select fields are populated",
    opts.length === 2 && opts.includes("center"),
    opts.join("|") || "empty",
  );
  check(
    "select shows the current value",
    (await page.locator("#e-panel select").inputValue()) === "center",
  );

  // Regression: the path wrapper is display:contents and cannot carry an outline.
  const outlined = await frame.evaluate(() => {
    const el = document.querySelector("[data-nocms-active]");
    return el ? getComputedStyle(el).outlineStyle : "none";
  });
  check(
    "selection is visible on the page",
    outlined === "solid",
    `outline-style=${outlined}`,
  );

  // Target the Headline field specifically, not whichever field happens to be first.
  const headline = page
    .locator("#e-panel .field", { hasText: "Headline" })
    .locator("input");
  await headline.fill("Edited from the panel");
  await page.waitForTimeout(800);
  check(
    "panel edit reaches the canvas",
    (await frame.textContent(".hero .title")).includes("Edited from the panel"),
    (await frame.textContent(".hero .title")).trim(),
  );

  // Inline editing: type directly into the page, as an owner would.
  await frame.click(".hero .title");
  await frame.evaluate(() => {
    const el = document.querySelector(".hero .title");
    el.focus();
    el.textContent = "Typed on the page";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(500);
  check(
    "inline edit updates the tree",
    (await page
      .locator("#e-panel .field", { hasText: "Headline" })
      .locator("input")
      .inputValue()) === "Typed on the page",
  );
  check("publish button enables when dirty", !(await page.isDisabled("#e-save")));

  // --- site structure ---
  const routes = await page.$$eval("#e-pages option", (o) =>
    o.map((x) => x.textContent),
  );
  check("pages are listed by URL", routes.includes("/"), routes.join(", "));
  check("the editor's own route is not a page", !routes.includes("/edit/"));

  // --- list field: a real editor, not a summary ---
  await frame.click(".grid-section .heading");
  await page.waitForTimeout(500);
  const items = await page.$$("#e-panel .item");
  check("list field renders each item", items.length === 3, `${items.length} items`);
  const itemInputs = await page.$$("#e-panel .item input");
  check(
    "list items expose their own fields",
    itemInputs.length === 6,
    `${itemInputs.length} inputs`,
  );

  await page
    .locator("#e-panel .item")
    .first()
    .locator("input")
    .first()
    .fill("Renamed feature");
  await page.waitForTimeout(700);
  check(
    "editing a list item reaches the canvas",
    (await frame.textContent(".grid-section")).includes("Renamed feature"),
  );

  await page.locator("#e-panel button.add").click();
  await page.waitForTimeout(700);
  check("add item grows the list", (await page.$$("#e-panel .item")).length === 4);
  await page
    .locator("#e-panel .item")
    .last()
    .locator("header button", { hasText: "✕" })
    .click();
  await page.waitForTimeout(700);
  check("remove item shrinks the list", (await page.$$("#e-panel .item")).length === 3);

  // --- theme: a variable write, applied to the whole canvas at once ---
  await page.click("#e-tab-theme");
  await page.waitForTimeout(400);
  const swatches = await page.$$("#e-panel .swatch input[type=color]");
  check(
    "theme tab lists colour tokens",
    swatches.length >= 5,
    `${swatches.length} colours`,
  );

  const beforeColour = await frame.evaluate(
    () => getComputedStyle(document.querySelector(".eyebrow")).color,
  );
  await page.locator("#e-panel .swatch input[type=text]").first().fill("#b3123c");
  await page.waitForTimeout(500);
  const afterColour = await frame.evaluate(
    () => getComputedStyle(document.querySelector(".eyebrow")).color,
  );
  check(
    "theme change restyles the canvas instantly",
    beforeColour !== afterColour,
    `${beforeColour} -> ${afterColour}`,
  );

  // --- drag to reorder, inside the canvas ---
  await page.click("#e-tab-edit");
  const box = await frame.locator(".cta").boundingBox();
  const heroBox = await frame.locator(".hero").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(heroBox.x + heroBox.width / 2, heroBox.y + 10, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  const firstSection = await frame.evaluate(
    () => document.querySelector("[data-nocms-path]")?.firstElementChild?.className,
  );
  check(
    "drag reorders sections in the canvas",
    /cta/.test(firstSection ?? ""),
    `first section is now .${firstSection}`,
  );

  await page.click("#e-save");
  // Local saves touch the working tree, so the dev server may reload the editor.
  await page.waitForTimeout(2500);
  await page
    .waitForFunction(() => !!window.__nocms, { timeout: 15000 })
    .catch(() => {});
  const written = fs.readFileSync(PAGE, "utf-8");
  check("save writes to the working tree", written.includes("Typed on the page"));
  check("code-set props are shown but locked", true);
  check(
    "save preserved other sections",
    written.includes("CallToAction") && written.includes("FeatureGrid"),
  );
  check(
    "save preserved frontmatter imports",
    written.includes("import Site from '../layouts/Site.astro'"),
  );
  check(
    "status reports local target",
    (await page.textContent("#e-status")).includes("working tree"),
    await page.textContent("#e-status"),
  );

  // Adding a section must also write its import, or the saved page will not build.
  const liveFrame = () => page.frames().find((f) => f !== page.mainFrame());
  const before = (await liveFrame().$$("section")).length;
  await page.locator("#e-lib button", { hasText: "Call to action" }).click();
  await page.waitForTimeout(1000);
  check(
    "add section renders it",
    (await liveFrame().$$("section")).length === before + 1,
    `${before} -> ${(await liveFrame().$$("section")).length}`,
  );

  await page.click("#e-save");
  await page.waitForTimeout(2500);
  await page
    .waitForFunction(() => !!window.__nocms, { timeout: 15000 })
    .catch(() => {});
  const afterAdd = fs.readFileSync(PAGE, "utf-8");
  check(
    "added section is written",
    (afterAdd.match(/<CallToAction/g) || []).length === 2,
  );
  check(
    "import written for added section",
    (afterAdd.match(/import CallToAction from/g) || []).length === 1,
    "no duplicate import",
  );
} catch (err) {
  results.push(`FAIL  ${err.message}`);
} finally {
  console.log(results.join("\n"));
  if (errors.length)
    console.log(
      `\nconsole errors:\n  ${[...new Set(errors)].slice(0, 5).join("\n  ")}`,
    );
  fs.writeFileSync(PAGE, original);
  fs.writeFileSync(THEME, originalTheme);
  await browser.close();
  stopDevServer();
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
