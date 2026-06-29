import { describe, expect, test } from "vitest";
import {
  type BlockBox,
  type Box,
  type DropZone,
  destinationIndex,
  dropGapAt,
  resolveDrop,
} from "./drag.js";

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

  test("an empty box list resolves to gap 0", () => {
    expect(dropGapAt([], 50)).toBe(0);
  });

  // A leading non-block sibling (frontmatter) isn't measured, so the boxes start past
  // index 0. Dropping above the first block must target that first real index, not 0 —
  // otherwise the first/last positions are unreachable.
  test("offset index space: above the first block targets the first real index", () => {
    const offset: BlockBox[] = [
      { index: 1, top: 0, bottom: 100 },
      { index: 2, top: 100, bottom: 200 },
    ];
    expect(dropGapAt(offset, -10)).toBe(1);
    expect(dropGapAt(offset, 40)).toBe(1);
    expect(dropGapAt(offset, 60)).toBe(2);
    expect(dropGapAt(offset, 999)).toBe(3);
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

const box = (left: number, top: number, right: number, bottom: number): Box => ({
  left,
  top,
  right,
  bottom,
});

describe("resolveDrop", () => {
  // A column Section ([0]) of two cards nested in the document root, plus a trailing top-level block.
  const root: DropZone = {
    path: [],
    axis: "vertical",
    box: box(0, 0, 200, 400),
    children: [
      { index: 0, box: box(0, 0, 200, 200) },
      { index: 1, box: box(0, 200, 200, 260) },
    ],
  };
  const section: DropZone = {
    path: [0],
    axis: "vertical",
    box: box(0, 0, 200, 200),
    children: [
      { index: 0, box: box(10, 10, 190, 90) },
      { index: 1, box: box(10, 100, 190, 180) },
    ],
  };

  test("the deepest container under the point wins", () => {
    const target = resolveDrop([root, section], 100, 120, [9]);
    expect(target?.parentPath).toEqual([0]);
    // y=120 clears card 0's midpoint (50) but not card 1's (140) -> gap 1.
    expect(target?.index).toBe(1);
    expect(target?.line.orientation).toBe("horizontal");
  });

  test("a point only the root covers lands at top level", () => {
    const target = resolveDrop([root, section], 100, 230, [9]);
    expect(target?.parentPath).toEqual([]);
    expect(target?.index).toBe(1);
  });

  test("the dragged node's own subtree is never a target", () => {
    // Dragging the Section itself: the point is inside it, but it (and its cards) are excluded,
    // so the drop falls back to the root.
    const target = resolveDrop([root, section], 100, 50, [0]);
    expect(target?.parentPath).toEqual([]);
  });

  test("a point over no container resolves to nothing", () => {
    expect(resolveDrop([section], 500, 500, [9])).toBeUndefined();
  });

  test("a horizontal container draws a vertical line between columns", () => {
    const row: DropZone = {
      path: [1],
      axis: "horizontal",
      box: box(0, 0, 300, 100),
      children: [
        { index: 0, box: box(0, 0, 100, 100) },
        { index: 1, box: box(100, 0, 200, 100) },
        { index: 2, box: box(200, 0, 300, 100) },
      ],
    };
    const target = resolveDrop([row], 150, 50, [9]);
    expect(target?.index).toBe(1);
    expect(target?.line.orientation).toBe("vertical");
    expect(target?.line.x).toBe(100);
  });

  // A row Grid ([1]) of three card *containers* filling it edge to edge — the first card's left is
  // the grid's left, so without an edge escape the grid's first/last gap can't be reached: every
  // point near the edge sits inside a card and would drop *into* it.
  const grid: DropZone = {
    path: [1],
    axis: "horizontal",
    box: box(0, 0, 300, 100),
    children: [
      { index: 0, box: box(0, 0, 100, 100) },
      { index: 1, box: box(100, 0, 200, 100) },
      { index: 2, box: box(200, 0, 300, 100) },
    ],
  };
  const card0: DropZone = {
    path: [1, 0],
    axis: "vertical",
    box: box(0, 0, 100, 100),
    children: [],
  };
  const card2: DropZone = {
    path: [1, 2],
    axis: "vertical",
    box: box(200, 0, 300, 100),
    children: [],
  };

  test("near a first child's leading edge escapes to the grid's gap 0", () => {
    // x=10 is inside card0 but within its left band -> insert before card0 in the grid.
    const target = resolveDrop([grid, card0, card2], 10, 50, [9]);
    expect(target?.parentPath).toEqual([1]);
    expect(target?.index).toBe(0);
    expect(target?.line.orientation).toBe("vertical");
    expect(target?.line.x).toBe(0);
  });

  test("near a last child's trailing edge escapes to the grid's final gap", () => {
    // x=295 is inside card2 but within its right band -> insert after card2 in the grid.
    const target = resolveDrop([grid, card0, card2], 295, 50, [9]);
    expect(target?.parentPath).toEqual([1]);
    expect(target?.index).toBe(3);
  });

  test("the centre of a child container still drops inside it", () => {
    const target = resolveDrop([grid, card0, card2], 50, 50, [9]);
    expect(target?.parentPath).toEqual([1, 0]);
    expect(target?.index).toBe(0);
  });

  test("an empty container accepts at index 0 with a centered line", () => {
    const empty: DropZone = {
      path: [2],
      axis: "vertical",
      box: box(0, 0, 100, 80),
      children: [],
    };
    const target = resolveDrop([empty], 50, 40, [9]);
    expect(target?.index).toBe(0);
    expect(target?.line.y).toBe(40);
  });
});
