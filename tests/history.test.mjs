import assert from "node:assert/strict";
import { test } from "node:test";
import { createHistory } from "../editor/history.mjs";

globalThis.window ??= { dispatchEvent() {} };
globalThis.CustomEvent ??= class {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
};

function setup(initial = "a") {
  let state = initial;
  const history = createHistory({
    snapshot: () => state,
    restore: (value) => {
      state = value;
    },
  });
  return { history, set: (v) => (state = v), get: () => state };
}

test("undo returns to the state before the change", async () => {
  const { history, set, get } = setup("a");
  history.record("x");
  set("b");
  await history.undo();
  assert.equal(get(), "a");
});

test("redo returns to the state after it", async () => {
  const { history, set, get } = setup("a");
  history.record("x");
  set("b");
  await history.undo();
  await history.redo();
  assert.equal(get(), "b");
});

test("typing collapses into one entry, so Cmd+Z is not per-letter", async () => {
  const { history, set, get } = setup("");
  let t = 1000;
  for (const value of ["H", "He", "Hel", "Hell", "Hello"]) {
    history.record("title", t);
    set(value);
    t += 50; // fast typing
  }
  await history.undo();
  assert.equal(get(), "", "the whole word is undone at once");
  assert.equal(history.canUndo, false);
});

test("a pause, or a different field, starts a new entry", async () => {
  const { history, set, get } = setup("a");
  history.record("title", 1000);
  set("b");
  history.record("title", 5000); // long pause
  set("c");
  await history.undo();
  assert.equal(get(), "b");

  history.record("other", 5100); // different field, no pause
  set("d");
  await history.undo();
  assert.equal(get(), "b");
});

test("a new change discards the redo stack", async () => {
  const { history, set, get } = setup("a");
  history.record("x");
  set("b");
  await history.undo();
  assert.equal(history.canRedo, true);
  history.record("y");
  set("c");
  assert.equal(history.canRedo, false);
  await history.undo();
  assert.equal(get(), "a");
});

test("restoring does not itself become an undo step", async () => {
  const { history, set } = setup("a");
  history.record("x");
  set("b");
  await history.undo();
  await history.undo();
  assert.equal(history.canUndo, false, "one change, one undo");
});

test("history is bounded", () => {
  const { history } = setup("a");
  for (let i = 0; i < 250; i++) history.record(`f${i}`, i * 10_000);
  assert.equal(history.canUndo, true);
});
