/**
 * What changed, in the owner's words.
 *
 * §4.7 asks that someone understand what they are about to publish "in plain language".
 * A git diff is the wrong instrument: it describes a file. This describes the page —
 * sections added, removed, moved, and which fields were edited.
 */
const label = (node) => node?.name ?? "section";

function indexSections(body) {
  const out = [];
  body.forEach((node, i) => {
    if (node.kind === "tag" && node.isSection) out.push({ node, i });
    if (node.kind === "tag") {
      node.children?.forEach((child, j) => {
        if (child.kind === "tag" && child.isSection)
          out.push({ node: child, i: j, nested: true });
      });
    }
  });
  return out;
}

const textOf = (prop) =>
  prop?.kind === "text"
    ? prop.value
    : prop?.kind === "data"
      ? JSON.stringify(prop.value)
      : null;

/** @returns {string[]} one sentence per change, ready to show as-is */
export function describeChanges(before, after) {
  const changes = [];
  const a = indexSections(before?.body ?? []);
  const b = indexSections(after?.body ?? []);

  const countBy = (list) => {
    const map = new Map();
    for (const { node } of list) map.set(label(node), (map.get(label(node)) ?? 0) + 1);
    return map;
  };
  const beforeCounts = countBy(a);
  const afterCounts = countBy(b);

  for (const [name, count] of afterCounts) {
    const was = beforeCounts.get(name) ?? 0;
    if (count > was)
      changes.push(`Added ${count - was} ${name} section${count - was > 1 ? "s" : ""}`);
  }
  for (const [name, was] of beforeCounts) {
    const count = afterCounts.get(name) ?? 0;
    if (was > count)
      changes.push(
        `Removed ${was - count} ${name} section${was - count > 1 ? "s" : ""}`,
      );
  }

  // Field edits, only for sections that still exist in the same position.
  const pairs = Math.min(a.length, b.length);
  for (let i = 0; i < pairs; i++) {
    if (label(a[i].node) !== label(b[i].node)) continue;
    for (const [prop, next] of Object.entries(b[i].node.props ?? {})) {
      const prev = a[i].node.props?.[prop];
      const nextText = textOf(next);
      const prevText = textOf(prev);
      if (prevText !== null && nextText !== null && prevText !== nextText) {
        changes.push(`Changed ${prop} in ${label(b[i].node)}`);
      }
    }
  }

  // Order, reported only when the set of sections is otherwise unchanged.
  const sameSet =
    a.length === b.length &&
    [...afterCounts].every(([n, c]) => beforeCounts.get(n) === c);
  if (
    sameSet &&
    a.map((x) => label(x.node)).join() !== b.map((x) => label(x.node)).join()
  ) {
    changes.push("Reordered the sections");
  }
  return changes;
}

/** Theme changes are separate: they affect every page, which the owner should be told. */
export function describeThemeChanges(before, after) {
  if (before === after) return [];
  const read = (css) =>
    new Map(
      [...(css ?? "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [
        m[1],
        m[2].trim(),
      ]),
    );
  const a = read(before);
  const b = read(after);
  const changed = [...b].filter(([k, v]) => a.get(k) !== v).map(([k]) => k);
  if (!changed.length) return [];
  return [
    changed.length === 1
      ? `Changed ${changed[0]} — affects every page`
      : `Changed ${changed.length} theme values — affects every page`,
  ];
}
