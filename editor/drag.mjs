/**
 * Drag to place, inside the canvas.
 *
 * The canvas is same-origin, so the editor attaches directly to the iframe document and
 * the drag never crosses the boundary — no postMessage, no HTML5 drag-and-drop.
 *
 * A drop target is any place whose role accepts what is being dragged, so a Button drops
 * into a nav and a Hero does not drop inside a Button. That is decided by roles rather
 * than per-component allow-lists, so adding a library needs no new rules.
 */
const LINE_ID = "nocms-drop-line";
const ZONE_ID = "nocms-drop-zone";

const pathOf = (el) => el?.dataset.nocmsPath?.split(".").map(Number) ?? null;
const roleOfEl = (el) => el?.dataset.nocmsRole ?? null;

function indicator(doc, id, css) {
  let el = doc.getElementById(id);
  if (!el) {
    el = doc.createElement("div");
    el.id = id;
    el.style.cssText = `position:absolute;pointer-events:none;z-index:2147483647;display:none;${css}`;
    doc.body.append(el);
  }
  return el;
}

const line = (doc) =>
  indicator(
    doc,
    LINE_ID,
    "left:0;right:0;height:3px;background:var(--brand,#1f6f5e);border-radius:2px",
  );
const zone = (doc) =>
  indicator(
    doc,
    ZONE_ID,
    "border:2px solid var(--brand,#1f6f5e);border-radius:8px;background:color-mix(in srgb,var(--brand,#1f6f5e) 8%,transparent)",
  );

const hide = (doc) => {
  line(doc).style.display = "none";
  zone(doc).style.display = "none";
};

/**
 * @param onDrop ({ from, toParent, toIndex }) => void
 * @param canDrop (movedPath, hostPath) => boolean
 */
export function enableDrag(doc, onDrop, canDrop) {
  if (doc.__nocmsDrag) return;
  doc.__nocmsDrag = true;

  let from = null;
  let target = null;

  const wrapperAt = (x, y) =>
    doc.elementFromPoint(x, y)?.closest?.("[data-nocms-path]") ?? null;
  const boxOf = (el) => (el.firstElementChild ?? el).getBoundingClientRect();
  const scrollY = () => doc.documentElement.scrollTop || doc.body.scrollTop || 0;

  doc.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    // Typing must not start a drag.
    if (e.target.closest?.("[contenteditable]")) return;
    const wrapper = wrapperAt(e.clientX, e.clientY);
    if (!wrapper) return;
    from = pathOf(wrapper);
  });

  doc.addEventListener("pointermove", (e) => {
    if (!from) return;
    doc.body.style.userSelect = "none";
    const wrapper = wrapperAt(e.clientX, e.clientY);
    const path = wrapper ? pathOf(wrapper) : null;
    if (!path || path.join(".").startsWith(from.join("."))) {
      // Never drop something inside itself.
      hide(doc);
      target = null;
      return;
    }

    const box = boxOf(wrapper);
    const parent = path.slice(0, -1);

    // Near the middle of a container, drop INSIDE it; near an edge, drop beside it.
    const insetY = Math.min(24, box.height / 3);
    const inside =
      roleOfEl(wrapper) === "container" &&
      e.clientY > box.top + insetY &&
      e.clientY < box.bottom - insetY;

    if (inside && canDrop(from, path)) {
      const el = zone(doc);
      el.style.display = "block";
      el.style.top = `${box.top + scrollY()}px`;
      el.style.left = `${box.left}px`;
      el.style.width = `${box.width}px`;
      el.style.height = `${box.height}px`;
      line(doc).style.display = "none";
      target = { toParent: path, toIndex: null };
      return;
    }

    if (!canDrop(from, parent)) {
      hide(doc);
      target = null;
      return;
    }
    const after = e.clientY > box.top + box.height / 2;
    const el = line(doc);
    el.style.display = "block";
    el.style.top = `${(after ? box.bottom : box.top) + scrollY() - 1}px`;
    el.style.left = `${box.left}px`;
    el.style.width = `${box.width}px`;
    el.style.right = "auto";
    zone(doc).style.display = "none";
    target = { toParent: parent, toIndex: path.at(-1) + (after ? 1 : 0) };
  });

  const finish = () => {
    if (from && target) onDrop({ from, ...target });
    from = null;
    target = null;
    hide(doc);
    doc.body.style.userSelect = "";
  };

  doc.addEventListener("pointerup", finish);
  doc.addEventListener("pointercancel", finish);
  doc.defaultView.addEventListener("blur", finish);
}
