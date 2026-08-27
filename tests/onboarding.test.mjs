import assert from "node:assert/strict";
import { test } from "node:test";
import { nextStep, progress, STEPS } from "../editor/onboarding.mjs";

test("exactly three concepts are exposed, and no more", () => {
  // §8.5: an account, a repository, a published address. Everything else is hidden
  // behind product language — no branches, no commits, no tokens as a concept.
  assert.deepEqual(
    STEPS.map((s) => s.id),
    ["account", "repository", "address"],
  );
});

test("no step leaks the tool's vocabulary", () => {
  const jargon = /\b(commit|branch|repository|token|OAuth|SHA|Actions|deploy|CI)\b/i;
  for (const step of STEPS) {
    assert.ok(!jargon.test(step.title), `title leaks jargon: ${step.title}`);
    assert.ok(!jargon.test(step.plain), `explanation leaks jargon: ${step.plain}`);
    assert.ok(!jargon.test(step.action), `action leaks jargon: ${step.action}`);
  }
});

test("every step is explained, not just named", () => {
  for (const step of STEPS) {
    assert.ok(step.plain.length > 60, `${step.id} is named but not explained`);
  }
});

test("the owner is never asked to redo a finished step", () => {
  assert.equal(nextStep({}).id, "account");
  assert.equal(nextStep({ signedIn: true }).id, "repository");
  assert.equal(nextStep({ signedIn: true, hasRepo: true }).id, "address");
  assert.equal(nextStep({ signedIn: true, hasRepo: true, hasAddress: true }), null);
});

test("progress reflects only what is actually true", () => {
  assert.deepEqual(progress({ signedIn: true }), {
    account: true,
    repository: false,
    address: false,
  });
});
