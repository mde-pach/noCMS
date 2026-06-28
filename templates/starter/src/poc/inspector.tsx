import {
  applyFacet,
  FACETS,
  type Facet,
  type ParsedClasses,
  type Scales,
} from "./facets";

const GROUPS = ["Color", "Spacing", "Shape", "Type"] as const;

interface InspectorProps {
  label: string;
  className: string;
  parsed: ParsedClasses;
  scales: Scales;
  onChange: (next: string) => void;
}

export function Inspector({
  label,
  className,
  parsed,
  scales,
  onChange,
}: InspectorProps) {
  const set = (facet: Facet, key: string) =>
    onChange(applyFacet(className, facet, key, scales));

  return (
    <aside style={panel}>
      <header style={{ marginBottom: 16 }}>
        <div style={eyebrow}>Selected</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{label}</div>
      </header>

      {GROUPS.map((group) => (
        <section key={group} style={{ marginBottom: 18 }}>
          <div style={groupLabel}>{group}</div>
          {FACETS.filter((f) => f.group === group).map((facet) => (
            <div key={facet.id} style={{ marginBottom: 10 }}>
              <div style={fieldLabel}>{facet.label}</div>
              {facet.scale === "color" ? (
                <Swatches
                  facet={facet}
                  current={parsed.values[facet.id]}
                  scales={scales}
                  set={set}
                />
              ) : (
                <Segments
                  facet={facet}
                  current={parsed.values[facet.id]}
                  scales={scales}
                  set={set}
                />
              )}
            </div>
          ))}
        </section>
      ))}

      <section style={{ marginTop: 8 }}>
        <div style={groupLabel}>class</div>
        <code style={readout}>{className || "—"}</code>
        {parsed.passthrough.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={fieldLabel}>passed through</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {parsed.passthrough.map((c) => (
                <span key={c} style={chip}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}

interface ControlProps {
  facet: Facet;
  current: string | undefined;
  scales: Scales;
  set: (facet: Facet, key: string) => void;
}

function Swatches({ facet, current, scales, set }: ControlProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {scales[facet.scale].map((opt) => (
        <button
          key={opt.key}
          type="button"
          title={opt.key}
          onClick={() => set(facet, current === opt.key ? "" : opt.key)}
          style={{
            ...swatch,
            background: opt.preview,
            outline:
              current === opt.key ? "2px solid #3b5bdb" : "1px solid rgba(0,0,0,0.15)",
          }}
        />
      ))}
    </div>
  );
}

function Segments({ facet, current, scales, set }: ControlProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {scales[facet.scale].map((opt) => {
        const on = current === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => set(facet, on ? "" : opt.key)}
            style={{ ...segment, ...(on ? segmentOn : {}) }}
          >
            {opt.key}
          </button>
        );
      })}
    </div>
  );
}

const panel: Record<string, string | number> = {
  width: 280,
  flex: "0 0 280px",
  alignSelf: "flex-start",
  position: "sticky",
  top: 24,
  background: "#fff",
  border: "1px solid #e6e6e6",
  borderRadius: 12,
  padding: 18,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  fontSize: 13,
  color: "#1a1a1a",
  boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
};
const eyebrow = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#8a8a8a",
} as const;
const groupLabel = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#3b5bdb",
  marginBottom: 8,
  fontWeight: 600,
} as const;
const fieldLabel = { fontSize: 12, color: "#666", marginBottom: 4 } as const;
const swatch = {
  width: 26,
  height: 26,
  borderRadius: 6,
  cursor: "pointer",
  padding: 0,
} as const;
const segment = {
  fontSize: 12,
  padding: "4px 9px",
  borderRadius: 6,
  border: "1px solid #ddd",
  background: "#fafafa",
  color: "#333",
  cursor: "pointer",
} as const;
const segmentOn = {
  background: "#3b5bdb",
  borderColor: "#3b5bdb",
  color: "#fff",
} as const;
const readout = {
  display: "block",
  background: "#f5f5f7",
  borderRadius: 6,
  padding: "8px 10px",
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
  color: "#1a1a1a",
  wordBreak: "break-word",
  lineHeight: 1.5,
} as const;
const chip = {
  fontSize: 11,
  padding: "2px 6px",
  borderRadius: 4,
  background: "#f0f0f3",
  color: "#888",
  fontFamily: "ui-monospace, monospace",
} as const;
