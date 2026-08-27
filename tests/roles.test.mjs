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
