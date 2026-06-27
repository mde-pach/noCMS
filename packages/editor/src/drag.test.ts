import { describe, expect, test } from "vitest";
import { type BlockBox, destinationIndex, dropGapAt } from "./drag.js";

const boxes: BlockBox[] = [
  { index: 0, top: 0, bottom: 100 },
  { index: 1, top: 100, bottom: 200 },
  { index: 2, top: 200, bottom: 300 },
];

describe("dropGapAt", () => {
  test("splits each block at its midpoint into sibling gaps", () => {
    expect(dropGapAt(boxes, -10)).toBe(0);
    expect(dropGapAt(boxes, 40)).toBe(0);
    expect(dropGapAt(boxes, 60)).toBe(1);
    expect(dropGapAt(boxes, 140)).toBe(1);
    expect(dropGapAt(boxes, 160)).toBe(2);
    expect(dropGapAt(boxes, 999)).toBe(3);
  });
});

describe("destinationIndex", () => {
  test("a gap after the source shifts left by one", () => {
    expect(destinationIndex(0, 2)).toBe(1);
    expect(destinationIndex(2, 0)).toBe(0);
  });

  test("dropping back into its own slot is a no-op", () => {
    expect(destinationIndex(1, 1)).toBeUndefined();
    expect(destinationIndex(1, 2)).toBeUndefined();
  });
});
