import { expect, type Page } from "@playwright/test";

/** Open the in-site editor, clear the sign-in scrim, and wait for the chrome to mount. */
export async function openEditor(page: Page): Promise<void> {
  await page.goto("/?edit");
  // `?edit` lazy-loads the editor, so the sign-in scrim appears a beat after navigation — wait for
  // it before deciding whether to click (a reused context may already be signed in and skip it).
  const gate = page.getByRole("button", { name: "Continue with GitHub" });
  await gate.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
  if (await gate.isVisible().catch(() => false)) await gate.click();
  await expect(page.locator('[aria-label="Breakpoint"]')).toBeVisible({
    timeout: 15_000,
  });
}

/** Select the block a canvas element belongs to by clicking it (the editor resolves the node). */
export async function selectByText(page: Page, text: string): Promise<void> {
  await page.locator("main").getByText(text, { exact: false }).first().click();
}

/** The capability section labels currently shown in the Style panel (excludes the mode bar). */
export function capabilityLabels(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const txt = (el: Element | null | undefined) => el?.textContent?.trim() ?? "";
    const stateBtn = [...document.querySelectorAll("button")].find(
      (b) => txt(b) === "Hover",
    );
    const panel = stateBtn?.closest("section")?.parentElement;
    if (!panel) return [];
    return [...panel.querySelectorAll("section")]
      .map((s) => txt(s.querySelector("div")))
      .filter((l) => l && !/Styling/.test(l) && !/Hover/.test(l));
  });
}

/** Click a swatch in the Style panel's colour control by its title (a colour family name). */
export async function applySwatch(page: Page, title: string): Promise<void> {
  await page.locator(`.nocms-editor-panel button[title="${title}"]`).first().click();
}

/** The active canvas width (the `--nocms-page-width` the breakpoint sets). */
export function pageWidth(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--nocms-page-width")
      .trim(),
  );
}

/** The class attribute of the first `<section>` in the canvas that matches `needle`. */
export function sectionClassMatching(page: Page, needle: string): Promise<string> {
  return page.evaluate((n) => {
    const hit = [...document.querySelectorAll("main section")]
      .map((s) => s.getAttribute("class") ?? "")
      .find((c) => c.includes(n));
    return hit ?? "";
  }, needle);
}
