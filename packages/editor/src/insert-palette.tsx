// The insert palette: the catalog of components a site can place, grouped by category and
// filterable. It renders from serializable manifests alone (never live BlockDefs), so a
// builtin component and a sandboxed plugin component look identical here (invariant #8).
// This is the "insert a block via `/`" step of the tracer slice (D16).

import type { ComponentManifest } from "@nocms/components";
import type { VNode } from "preact";
import { useMemo, useState } from "preact/hooks";

export interface InsertPaletteProps {
  /** the catalog to offer, in declaration order. */
  manifests: ComponentManifest[];
  /** fired with the chosen manifest; the shell builds + inserts the node. */
  onInsert: (manifest: ComponentManifest) => void;
}

function matches(manifest: ComponentManifest, query: string): boolean {
  if (!query) return true;
  const haystack = [
    manifest.name,
    manifest.displayName,
    manifest.description ?? "",
    manifest.category,
    ...(manifest.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function groupByCategory(
  manifests: ComponentManifest[],
): [string, ComponentManifest[]][] {
  const groups = new Map<string, ComponentManifest[]>();
  for (const manifest of manifests) {
    const list = groups.get(manifest.category) ?? [];
    list.push(manifest);
    groups.set(manifest.category, list);
  }
  return [...groups.entries()];
}

export function InsertPalette({ manifests, onInsert }: InsertPaletteProps): VNode {
  const [query, setQuery] = useState("");
  const groups = useMemo(
    () => groupByCategory(manifests.filter((m) => matches(m, query))),
    [manifests, query],
  );

  return (
    <div class="nocms-palette">
      <h2 class="nocms-palette-title">Insert</h2>
      <input
        class="nocms-palette-search"
        type="search"
        placeholder="Search components…"
        value={query}
        onInput={(e) => setQuery(e.currentTarget.value)}
      />
      {groups.length === 0 ? (
        <p class="nocms-empty">No components match.</p>
      ) : (
        groups.map(([category, items]) => (
          <div key={category} class="nocms-palette-group">
            <p class="nocms-palette-cat">{category}</p>
            {items.map((manifest) => (
              <button
                key={manifest.name}
                type="button"
                class="nocms-palette-item"
                title={manifest.description}
                onClick={() => onInsert(manifest)}
              >
                <span class="nocms-palette-name">{manifest.displayName}</span>
                {manifest.description ? (
                  <span class="nocms-palette-desc">{manifest.description}</span>
                ) : null}
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
