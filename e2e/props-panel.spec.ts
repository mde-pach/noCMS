import { expect, test } from "@playwright/test";
import { openEditor, selectByText } from "./_helpers";

// The props panel end-to-end: a schema-derived control writes a prop, the doc re-serializes, and the
// canvas re-renders with the new value. The matrix proves every kind's widget+write in isolation;
// this proves the selection → field → live-canvas path holds in the real editor.

test("editing a text prop updates the live canvas", async ({ page }) => {
  await openEditor(page);
  await selectByText(page, "Your website lives in your repo");

  const heading = page.locator("main h1").first();
  const original = ((await heading.textContent()) ?? "").trim();
  expect(original.length).toBeGreaterThan(0);

  // Find the props field holding the heading's text (its title prop), by current value.
  const fieldName = await page.evaluate((title) => {
    const fields = [
      ...document.querySelectorAll(
        ".nocms-editor-panel input, .nocms-editor-panel textarea",
      ),
    ] as (HTMLInputElement | HTMLTextAreaElement)[];
    return fields.find((f) => f.value.trim() === title)?.getAttribute("name") ?? null;
  }, original);
  expect(fieldName, "a props field should mirror the heading text").toBeTruthy();

  const next = `${original} — smoke edit`;
  await page.locator(`.nocms-editor-panel [name="${fieldName}"]`).fill(next);

  await expect(heading).toHaveText(next);
});
