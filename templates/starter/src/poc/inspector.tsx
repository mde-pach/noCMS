import { useState } from "preact/hooks";
import { CapabilityBrowser } from "./capabilities";
import { STATES, type StateKey, VIEWPORTS, type ViewportKey, variantOf } from "./modes";

const ACCENT = "#3b5bdb";

interface InspectorProps {
  label: string;
  tag: string;
  className: string;
  viewport: ViewportKey;
  state: StateKey;
  onApplyClass: (cls: string, featureId: string) => void;
  onViewport: (v: ViewportKey) => void;
  onState: (s: StateKey) => void;
}

export function Inspector(props: InspectorProps) {
  const variant = variantOf(props.viewport, props.state);
  return (
    <aside style={panel}>
      <header style={{ marginBottom: 14 }}>
        <div style={eyebrow}>Editing</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{props.label}</div>
      </header>
      <ModeBar {...props} />
      <CapabilityBrowser
        tag={props.tag}
        className={props.className}
        variant={variant}
        onApply={props.onApplyClass}
      />
      <Inspect className={props.className} />
    </aside>
  );
}

function ModeBar({ viewport, state, onViewport, onState }: InspectorProps) {
  return (
    <div style={modeBar}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {VIEWPORTS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => onViewport(v.key)}
            style={chipBtn(viewport === v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
        {STATES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onState(s.key)}
            style={chipBtn(state === s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {(viewport !== "base" || state !== "default") && (
        <div style={{ fontSize: 11, color: "#8a8a8a", marginTop: 6 }}>
          Editing the {viewport !== "base" ? viewport.toUpperCase() : ""}{" "}
          {state !== "default" ? state : ""} variant — base stays the default.
        </div>
      )}
    </div>
  );
}

function Inspect({ className }: { className: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          fontSize: 11,
          color: "#999",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {open ? "▾" : "▸"} Inspect (Tailwind classes)
      </button>
      {open && <code style={readout}>{className || "—"}</code>}
    </div>
  );
}

const panel: Record<string, string | number> = {
  width: 310,
  flex: "0 0 310px",
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
const modeBar = {
  background: "#f6f7fb",
  borderRadius: 8,
  padding: 8,
  marginBottom: 16,
} as const;
const eyebrow = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#8a8a8a",
} as const;
const chipBtn = (on: boolean) =>
  ({
    fontSize: 11.5,
    padding: "4px 9px",
    borderRadius: 6,
    border: "1px solid",
    borderColor: on ? ACCENT : "#dcdce3",
    background: on ? "#fff" : "transparent",
    color: on ? ACCENT : "#777",
    fontWeight: on ? 600 : 400,
    cursor: "pointer",
  }) as const;
const readout = {
  display: "block",
  marginTop: 8,
  background: "#f5f5f7",
  borderRadius: 6,
  padding: "8px 10px",
  fontFamily: "ui-monospace, monospace",
  fontSize: 11.5,
  color: "#444",
  wordBreak: "break-word",
  lineHeight: 1.5,
} as const;
