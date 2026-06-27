import { describe, expect, test } from "vitest";
import { createHistory } from "./history.js";

describe("createHistory", () => {
  test("undo/redo walk the snapshot stack", () => {
    const h = createHistory("a");
    h.push("b");
    h.push("c");
    expect(h.current()).toBe("c");
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);

    expect(h.undo()).toBe("b");
    expect(h.undo()).toBe("a");
    expect(h.undo()).toBeUndefined();
    expect(h.canUndo()).toBe(false);

    expect(h.redo()).toBe("b");
    expect(h.redo()).toBe("c");
    expect(h.redo()).toBeUndefined();
  });

  test("a push after undo truncates the redo branch", () => {
    const h = createHistory("a");
    h.push("b");
    h.push("c");
    h.undo(); // → b
    h.push("d");
    expect(h.current()).toBe("d");
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBe("b");
  });

  test("an identical consecutive snapshot costs no step", () => {
    const h = createHistory("a");
    h.push("a");
    h.push("a");
    expect(h.canUndo()).toBe(false);
    h.push("b");
    expect(h.undo()).toBe("a");
  });
});
