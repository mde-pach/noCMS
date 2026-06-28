import { useMemo, useState } from "preact/hooks";
import { CATALOG, groupCounts, search } from "./catalog";

const ACCENT = "#3b5bdb";

// "Add anything": search the complete engine-derived catalog. The curated controls above are the
// guided default; this is the escape to the full Tailwind surface — nothing is out of reach.
export function Palette({ onApply }: { onApply: (cls: string, root: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const counts = useMemo(() => groupCounts(), []);
  const hits = useMemo(() => search(q, group), [q, group]);

  return (
    <div style={{ marginTop: 4 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={addBtn}>
        {open
          ? "× Close"
          : `+ Add anything · ${CATALOG.total.toLocaleString()} utilities`}
      </button>
      {open && (
        <div style={menu}>
          <input
            value={q}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
            placeholder="Search any Tailwind utility…"
            style={input}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {counts.map((c) => (
              <button
                key={c.group}
                type="button"
                onClick={() => setGroup(group === c.group ? null : c.group)}
                style={chip(group === c.group)}
                title={`${c.count} utilities`}
              >
                {c.group}
              </button>
            ))}
          </div>
          {q || group ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {hits.length === 0 && <div style={note}>No matches.</div>}
              {hits.map((h) => (
                <button
                  key={h.cls}
                  type="button"
                  title={`${h.label} · ${h.group}`}
                  onClick={() => onApply(h.cls, h.root)}
                  style={hit}
                >
                  {h.cls}
                </button>
              ))}
              {hits.length >= 80 && (
                <div style={note}>Showing the first 80 — refine to narrow.</div>
              )}
            </div>
          ) : (
            <div style={note}>
              Pick a category or search — the full Tailwind surface for this theme.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const addBtn = {
  fontSize: 12,
  padding: "7px 10px",
  borderRadius: 6,
  border: `1px dashed ${ACCENT}`,
  background: "#fff",
  color: ACCENT,
  cursor: "pointer",
  width: "100%",
} as const;
const menu = {
  marginTop: 8,
  padding: 10,
  border: "1px solid #eee",
  borderRadius: 8,
  background: "#fbfbfd",
} as const;
const input = {
  width: "100%",
  boxSizing: "border-box",
  fontSize: 13,
  padding: "7px 9px",
  borderRadius: 6,
  border: "1px solid #dcdce3",
  marginBottom: 8,
} as const;
const chip = (on: boolean) =>
  ({
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid",
    borderColor: on ? ACCENT : "#e0e0e6",
    background: on ? ACCENT : "#fff",
    color: on ? "#fff" : "#666",
    cursor: "pointer",
  }) as const;
const hit = {
  fontSize: 11.5,
  padding: "3px 7px",
  borderRadius: 5,
  border: "1px solid #e0e0e6",
  background: "#fff",
  color: "#333",
  cursor: "pointer",
  fontFamily: "ui-monospace, monospace",
} as const;
const note = { fontSize: 11.5, color: "#999", padding: "4px 2px" } as const;
