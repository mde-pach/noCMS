import assert from "node:assert/strict";
import { test } from "node:test";
import { accepts, DEFAULT_ROLE, roleOf, standsAlone } from "../src/lib/roles.mjs";

const c = (role) => (role ? { meta: { role } } : { meta: {} });

test("a component with no descriptor is inline, not privileged", () => {
  assert.equal(roleOf(undefined), DEFAULT_ROLE);
  assert.equal(roleOf(c()), "inline");
  assert.equal(roleOf({ meta: { role: "nonsense" } }), "inline");
});

test("a button drops into a navbar", () => {
  // The case that exposed the section assumption in the first place.
  assert.equal(accepts("container", roleOf(c("inline"))), true);
});

test("a hero does not drop inside a button", () => {
  assert.equal(accepts("inline", roleOf(c("block"))), false);
});

test("a page takes things that stand alone, not loose inlines", () => {
  assert.equal(standsAlone(c("block")), true);
  assert.equal(standsAlone(c("container")), true);
  assert.equal(standsAlone(c("inline")), false, "a bare Button is not a page element");
});

test("containers nest", () => {
  assert.equal(accepts("container", "container"), true);
  assert.equal(accepts("container", "block"), true);
});

test("a slot may override what it takes", () => {
  assert.equal(accepts("container", "block", ["inline"]), false);
  assert.equal(accepts("inline", "block", ["block"]), true);
});

test("a hero cannot be dropped inside a button, a button can go in a nav", () => {
  // The two directions that matter for "components must be draggable in their
  // dedicated targeted place".
  assert.equal(accepts("container", "inline"), true, "Button into Nav");
  assert.equal(accepts("inline", "block"), false, "Hero into Button");
  assert.equal(accepts("page", "inline"), false, "a bare Button is not a page element");
  assert.equal(accepts("page", "block"), true, "a Hero is");
});
