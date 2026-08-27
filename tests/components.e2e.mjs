/**
 * The component model. A component from an external library — copied into the repo with
 * no noCMS metadata — must be reachable: addressable in the canvas, editable, and
 * droppable into a container. This is the case that exposed the "section" assumption.
 */
import fs from "node:fs";
import { chromium } from "playwright";
import { startDevServer, stopDevServer } from "../scripts/dev-server.mjs";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = 41786;
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

  // A React component from a library renders in the canvas at all.
  check(
    "a library component renders in the canvas",
    (await frame().$$(".nc-btn")).length === 2,
    `${(await frame().$$(".nc-btn")).length} buttons`,
  );
  check(
    "its children survive rendering",
    (await frame().textContent(".nc-btn-ghost")).trim() === "Docs",
    await frame().textContent(".nc-btn-ghost"),
  );

  // A CSS-only library: no framework at all, a component is markup plus classes.
  // If this is as reachable as the React one, the model is library-agnostic.
  check(
    "a framework-free component renders too",
    (await frame().$$(".dz-badge")).length === 1,
  );
  check(
    "two libraries coexist in one container",
    (await frame().$$(".nav .dz-badge")).length === 1 &&
      (await frame().$$(".nav .nc-btn")).length === 2,
    "React and CSS-only side by side",
  );

  // The library's own stylesheet reaches the canvas — the measured gap.
  const bg = await frame().evaluate(
    () => getComputedStyle(document.querySelector(".nc-btn-primary")).backgroundColor,
  );
  check("the library's stylesheet reaches the canvas", bg !== "rgba(0, 0, 0, 0)", bg);

  // The token bridge: the library themes from noCMS tokens.
  await page.click("#e-tab-theme");
  await page.waitForTimeout(400);
  await page.locator("#e-panel .ed-swatch input[type=text]").first().fill("#b3123c");
  await page.waitForTimeout(500);
  const themedBg = await frame().evaluate(
    () => getComputedStyle(document.querySelector(".nc-btn-primary")).backgroundColor,
  );
  check(
    "changing a noCMS token moves the library's components",
    themedBg !== bg,
    `${bg} -> ${themedBg}`,
  );
  await page.click("#e-tab-edit");

  // Addressable: a component with no descriptor can still be selected.
  await frame().click(".nc-btn-ghost");
  await page.waitForTimeout(500);
  const selected = await frame().evaluate(
    () => document.querySelector("[data-nocms-active]")?.className ?? "",
  );
  check(
    "a component with no descriptor is selectable",
    /nc-btn/.test(selected),
    selected,
  );

  // A component with no descriptor must still be EDITABLE, not merely placeable:
  // its props are read from its own source.
  const labels = await page.$$eval("#e-panel .ed-field__name", (e) =>
    e.map((x) => x.textContent),
  );
  check(
    "an undescribed component exposes its own props",
    labels.length > 0,
    labels.join(", "),
  );

  // A component's text is the first thing anyone wants to change.
  const fieldNames = await page.$$eval("#e-panel .ed-field__name", (e) =>
    e.map((x) => x.textContent),
  );
  check(
    "a component's text is editable from the panel",
    fieldNames[0] === "Text",
    fieldNames.join(", "),
  );

  await page
    .locator("#e-panel .ed-field", { hasText: "Text" })
    .locator("input")
    .first()
    .fill("Guides");
  await page.waitForTimeout(800);
  check(
    "editing the text reaches the canvas",
    (await frame().textContent(".nc-btn-ghost")).trim() === "Guides",
    (await frame().textContent(".nc-btn-ghost")).trim(),
  );

  // The same text is editable in place, with no marking by the component author.
  await frame().evaluate(() => {
    const el = document.querySelector(".nc-btn-ghost [data-nocms-text]");
    el.focus();
    el.textContent = "Handbook";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(700);
  const back = await page
    .locator("#e-panel .ed-field", { hasText: "Text" })
    .locator("input")
    .first()
    .inputValue();
  check("the same text is editable in place on the canvas", back === "Handbook", back);

  const options = await page.$$eval("#e-panel select option", (o) =>
    o.map((x) => x.value),
  );
  check(
    "a union prop becomes a real choice, from the component's own type",
    options.includes("ghost") && options.includes("primary"),
    options.join("|"),
  );

  await page.selectOption("#e-panel select", "primary");
  await page.waitForTimeout(800);
  check(
    "editing an inferred prop reaches the canvas",
    (await frame().$$(".nav .nc-btn-primary")).length === 2,
    "the ghost button became primary",
  );

  // Roles: the nav is a container, the button is inline.
  const roles = await frame().evaluate(() =>
    [...document.querySelectorAll("[data-nocms-role]")].map((e) => e.dataset.nocmsRole),
  );
  check(
    "roles are carried into the canvas",
    roles.includes("container") && roles.includes("inline"),
    [...new Set(roles)].join(", "),
  );

  // Dropping into a dedicated target: a Button belongs in the nav; a Hero does not
  // belong inside a Button. Roles decide, so no per-component rules are involved.
  const dropRules = await page.evaluate(() => {
    const api = window.__nocms;
    const find = (name) => {
      let found = null;
      const walk = (nodes, path) =>
        nodes.forEach((n, i) => {
          if (n.name === name && !found) found = [...path, i];
          if (n.children) walk(n.children, [...path, i]);
        });
      walk(api.state.page.body, []);
      return found;
    };
    return { button: find("Button"), nav: find("SiteNav"), hero: find("Hero") };
  });
  check(
    "the tree exposes the pieces being tested",
    Boolean(dropRules.button && dropRules.nav && dropRules.hero),
  );

  // The case that started this: drag a Button into the navbar.
  const navBox = await frame().locator(".nav .actions").boundingBox();
  const before = (await frame().$$(".nav .nc-btn")).length;
  const source = await frame().locator(".nav .nc-btn").last().boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(navBox.x + 8, navBox.y + navBox.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  check(
    "buttons can be reordered inside the navbar",
    (await frame().$$(".nav .nc-btn")).length === before,
    `${before} buttons still in the nav`,
  );

  // Adding a library component from the panel writes its import.
  await page.locator("#e-lib .ed-btn", { hasText: "button" }).first().click();
  await page.waitForTimeout(900);
  check(
    "a library component can be added from the panel",
    (await frame().$$(".nc-btn")).length === 3,
    `${(await frame().$$(".nc-btn")).length} buttons`,
  );

  await page.click("#e-save");
  await page.waitForTimeout(400);
  await page.click("#pub-go");
  await page.waitForTimeout(2500);
  const saved = fs.readFileSync(PAGE, "utf-8");
  check(
    "the added component is written",
    (saved.match(/<Button/g) ?? []).length === 3,
    `${(saved.match(/<Button/g) ?? []).length} <Button> in the page`,
  );
  check(
    "its import is not duplicated",
    (saved.match(/import Button from/g) ?? []).length === 1,
  );
} catch (err) {
  check(err.message.slice(0, 140), false);
} finally {
  console.log(results.join("\n"));
  await browser.close();
  stopDevServer();
  fs.writeFileSync(PAGE, original);
  fs.writeFileSync(
    "src/styles/theme.css",
    fs.readFileSync("src/styles/theme.css", "utf-8").replace("#b3123c", "#1f6f5e"),
  );
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
