/**
 * Drag to reorder, inside the canvas.
 *
 * The canvas is same-origin, so the editor attaches directly to the iframe document
 * and the drag never crosses the boundary — no postMessage, no HTML5 drag-and-drop.
 * Hit-testing is elementFromPoint in the frame's own coordinate space.
 */
const LINE_ID = "nocms-drop-line";

const pathOf = (el) => el?.dataset.nocmsPath?.split(".").map(Number) ?? null;
const samePar = (a, b) =>
  a && b && a.length === b.length && a.slice(0, -1).every((v, i) => v === b[i]);

function line(doc) {
  let el = doc.getElementById(LINE_ID);
  if (!el) {
    el = doc.createElement("div");
    el.id = LINE_ID;
    el.style.cssText =
      "position:absolute;left:0;right:0;height:3px;background:var(--brand,#1f6f5e);" +
      "pointer-events:none;z-index:2147483647;border-radius:2px;display:none";
    doc.body.append(el);
  }
  return el;
}

/** @param onDrop (fromPath, toIndex) => void */
export function enableDrag(doc, onDrop) {
  if (doc.__nocmsDrag) return;
  doc.__nocmsDrag = true;

  let from = null;
  let target = null;

  const sectionAt = (x, y) => {
    const el = doc.elementFromPoint(x, y);
    return el?.closest?.("[data-nocms-path]") ?? null;
  };

  doc.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    // Typing must not start a drag.
    if (e.target.closest?.("[contenteditable]")) return;
    const wrapper = sectionAt(e.clientX, e.clientY);
    if (!wrapper) return;
    from = pathOf(wrapper);
    doc.body.style.userSelect = "none";
  });

  doc.addEventListener("pointermove", (e) => {
    if (!from) return;
    const wrapper = sectionAt(e.clientX, e.clientY);
    const path = pathOf(wrapper);
    // Only reorder among siblings; dropping into a different parent is a separate move.
    if (!path || !samePar(path, from)) {
      line(doc).style.display = "none";
      target = null;
      return;
    }
    const box = (wrapper.firstElementChild ?? wrapper).getBoundingClientRect();
    const after = e.clientY > box.top + box.height / 2;
    const indicator = line(doc);
    indicator.style.display = "block";
    indicator.style.top = `${(after ? box.bottom : box.top) + doc.documentElement.scrollTop - 1}px`;
    target = { index: path.at(-1) + (after ? 1 : 0), parent: path.slice(0, -1) };
  });

  const finish = () => {
    if (from && target) {
      // Removing the dragged node first shifts anything after it down by one.
      const to = target.index > from.at(-1) ? target.index - 1 : target.index;
      if (to !== from.at(-1)) onDrop(from, to);
    }
    from = null;
    target = null;
    line(doc).style.display = "none";
    doc.body.style.userSelect = "";
  };

  doc.addEventListener("pointerup", finish);
  doc.addEventListener("pointercancel", finish);
  doc.defaultView.addEventListener("blur", finish);
}
