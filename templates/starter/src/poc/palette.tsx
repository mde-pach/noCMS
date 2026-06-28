import { useMemo, useState } from "preact/hooks";
import {
  CATALOG,
  currentClass,
  type Feature,
  groupCounts,
  searchFeatures,
} from "./catalog";

const ACCENT = "#3b5bdb";
const MAX_OPTS = 48;

// "Add anything": the full Tailwind surface as design controls. You search a *feature* ("border",
// "rotate", "shadow") and get a control over its values — never a class name. Class strings live
// only in dev Inspect.
export function Palette({
  className,
  variant,
  onApply,
}: {
  className: string;
  variant: string;
  onApply: (cls: string, featureId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const counts = useMemo(() => groupCounts(), []);
  const features = useMemo(() => searchFeatures(q, group), [q, group]);

  return (
    <div style={{ marginTop: 4 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={addBtn}>
        {open ? "× Close" : `+ Add anything · ${CATALOG.features.length} controls`}
      </button>
      {open && (
        <div style={menu}>
          <input
            value={q}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
            placeholder="Search a property — border, shadow, rotate…"
            style={input}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {counts.map((c) => (
              <button
                key={c.group}
                type="button"
                onClick={() => setGroup(group === c.group ? null : c.group)}
                style={chip(group === c.group)}
                title={`${c.count} controls`}
              >
                {c.group}
              </button>
            ))}
          </div>
          {q || group ? (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {features.length === 0 && <div style={note}>No matching property.</div>}
              {features.map((f) => (
                <FeatureControl
                  key={f.id}
                  feature={f}
                  className={className}
                  variant={variant}
                  onApply={onApply}
                />
              ))}
            </div>
          ) : (
            <div style={note}>
              Pick a category or search — every property is a control here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeatureControl({
  feature,
  className,
  variant,
  onApply,
}: {
  feature: Feature;
  className: string;
  variant: string;
  onApply: (cls: string, id: string) => void;
}) {
  const current = currentClass(className, feature.id, variant);
  const opts = feature.options.slice(0, MAX_OPTS);
  const set = (cls: string) => onApply(current === cls ? "" : cls, feature.id);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={featLabel}>{feature.label}</div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: feature.control === "color" ? 5 : 4,
          alignItems: "center",
        }}
      >
        {feature.control === "color"
          ? opts.map((o) => (
              <button
                key={o.cls}
                type="button"
                title={o.value}
                onClick={() => set(o.cls)}
                style={{
                  ...swatch,
                  background: o.value,
                  outline:
                    current === o.cls
                      ? `2px solid ${ACCENT}`
                      : "1px solid rgba(0,0,0,0.14)",
                }}
              />
            ))
          : opts.map((o) => (
              <button
                key={o.cls}
                type="button"
                title={o.value}
                onClick={() => set(o.cls)}
                style={{ ...optChip, ...(current === o.cls ? optOn : {}) }}
              >
                {o.label}
              </button>
            ))}
        {feature.options.length > MAX_OPTS && (
          <span style={note}>+{feature.options.length - MAX_OPTS} more — refine</span>
        )}
      </div>
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
const featLabel = {
  fontSize: 12,
  color: "#555",
  marginBottom: 5,
  fontWeight: 500,
} as const;
const swatch = {
  width: 24,
  height: 24,
  borderRadius: 6,
  cursor: "pointer",
  padding: 0,
} as const;
const optChip = {
  fontSize: 11.5,
  padding: "3px 8px",
  borderRadius: 5,
  border: "1px solid #e0e0e6",
  background: "#fff",
  color: "#333",
  cursor: "pointer",
} as const;
const optOn = { background: ACCENT, borderColor: ACCENT, color: "#fff" } as const;
const note = { fontSize: 11.5, color: "#999", padding: "2px" } as const;
