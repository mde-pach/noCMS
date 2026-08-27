import assert from "node:assert/strict";
import { test } from "node:test";
import { describeBudget, fileNameFor } from "../editor/images.mjs";

test("filenames are readable and safe for a URL", () => {
  assert.equal(fileNameFor("My Holiday Photo.JPG"), "my-holiday-photo.webp");
  assert.equal(fileNameFor("café_señor.png"), "cafe-senor.webp");
  assert.equal(fileNameFor("....."), "image.webp");
  assert.equal(fileNameFor("a/b\\c.jpeg"), "a-b-c.webp");
});

test("everything becomes webp, whatever went in", () => {
  for (const input of ["a.png", "a.jpg", "a.gif", "a.avif", "a.heic"]) {
    assert.ok(fileNameFor(input).endsWith(".webp"), input);
  }
});

test("the storage budget is described in units a person uses", () => {
  assert.equal(describeBudget(500 * 1024).used, "500 KB");
  assert.equal(describeBudget(5 * 1024 * 1024).used, "5.0 MB");
  assert.equal(describeBudget(100 * 1024 * 1024).warn, false);
  assert.equal(
    describeBudget(700 * 1024 * 1024).warn,
    true,
    "over half the Pages ceiling",
  );
});
