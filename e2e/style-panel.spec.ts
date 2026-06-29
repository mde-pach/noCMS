import { expect, test } from "@playwright/test";
import {
  applySwatch,
  capabilityLabels,
  openEditor,
  pageWidth,
  sectionClassMatching,
  selectByText,
} from "./_helpers";

// The Style panel end-to-end: tag-aware controls (the painted root tag, not the component name),
// the unified top-bar viewport (one control sizes the canvas AND scopes the variant), and the
// in-page Tailwind engine compiling what the panel writes. The matrices prove the logic; this proves
// the wiring.

test("selecting a component shows controls relevant to its painted root tag", async ({
  page,
}) => {
  await openEditor(page);
  await selectByText(page, "Your website lives in your repo");
  // The hero is a component whose root is a <section>; relevance must reflect that, not "Hero".
  const labels = await capabilityLabels(page);
  expect(labels).toEqual(
    expect.arrayContaining([
      "Color",
      "Padding",
      "Size",
      "Corners",
      "Effects",
      "Layout",
    ]),
  );
});

test("the top-bar viewport sizes the canvas and scopes the authored variant", async ({
  page,
}) => {
  await openEditor(page);
  await selectByText(page, "Your website lives in your repo");

  // Base is the default: unprefixed authoring, mobile canvas.
  expect(await pageWidth(page)).toBe("390px");

  await page
    .locator('[aria-label="Breakpoint"]')
    .getByText("MD", { exact: true })
    .click();
  expect(await pageWidth(page)).toBe("768px");

  // Applying a colour now writes a `md:`-scoped class on the selected section.
  await applySwatch(page, "Brand");
  expect(await sectionClassMatching(page, "md:bg-brand-500")).toContain(
    "md:bg-brand-500",
  );
});

test("viewport and interaction state compose into one variant", async ({ page }) => {
  await openEditor(page);
  await selectByText(page, "Your website lives in your repo");
  await page
    .locator('[aria-label="Breakpoint"]')
    .getByText("MD", { exact: true })
    .click();

  await page.locator(".nocms-editor-panel").getByText("Hover", { exact: true }).click();
  await applySwatch(page, "Sky");

  const cls = await sectionClassMatching(page, "md:hover:bg-sky-500");
  expect(cls).toContain("md:hover:bg-sky-500");
});

test("the in-page Tailwind engine compiles a rule for an authored variant", async ({
  page,
}) => {
  await openEditor(page);
  await selectByText(page, "Your website lives in your repo");
  await page.locator(".nocms-editor-panel").getByText("Hover", { exact: true }).click();
  await applySwatch(page, "Brand");

  // What you preview is what you publish: the variant the panel wrote must actually compile.
  await expect
    .poll(() =>
      page.evaluate(() => {
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (
                rule.cssText.includes("bg-brand-500") &&
                rule.cssText.includes(":hover")
              )
                return true;
            }
          } catch {}
        }
        return false;
      }),
    )
    .toBe(true);
});
