import { useState } from "preact/hooks";
import {
  applyFacet,
  FACETS,
  type Facet,
  type Option,
  optionsOf,
  parseClasses,
  type Scales,
} from "./facets";
import { STATES, type StateKey, VIEWPORTS, type ViewportKey, variantOf } from "./modes";

const GROUPS = ["Color", "Spacing", "Border", "Effects", "Type"] as const;
const ACCENT = "#3b5bdb";

interface InspectorProps {
  label: string;
  className: string;
  defaultClasses: string;
  scales: Scales;
  shownIds: string[];
  viewport: ViewportKey;
  state: StateKey;
  onChange: (next: string) => void;
  onAdd: (facetId: string) => void;
  onViewport: (v: ViewportKey) => void;
  onState: (s: StateKey) => void;
}

export function Inspector(props: InspectorProps) {
  const { className, defaultClasses, scales, shownIds, viewport, state } = props;
  const variant = variantOf(viewport, state);
  const parsed = parseClasses(className, scales, variant);
  const base = parseClasses(defaultClasses, scales);
  const shown = FACETS.filter((f) => shownIds.includes(f.id));

  return (
    <aside style={panel}>
      <header style={{ marginBottom: 14 }}>
        <div style={eyebrow}>Editing</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{props.label}</div>
      </header>

      <ModeBar {...props} />

      {GROUPS.filter((g) => shown.some((f) => f.group === g)).map((group) => (
        <section key={group} style={{ marginBottom: 16 }}>
          <div style={groupLabel}>{group}</div>
          {shown
            .filter((f) => f.group === group)
            .map((facet) => (
              <Field
                key={facet.id}
                facet={facet}
                current={parsed.values[facet.id]}
                baseValue={base.values[facet.id]}
                scales={scales}
                isBase={variant === ""}
                onSet={(key) =>
                  props.onChange(applyFacet(className, facet, key, scales, variant))
                }
                onReset={() =>
                  props.onChange(
                    applyFacet(
                      className,
                      facet,
                      variant === "" ? (base.values[facet.id] ?? "") : "",
                      scales,
                      variant,
                    ),
                  )
                }
              />
            ))}
        </section>
      ))}

      <AddProperty shownIds={shownIds} onAdd={props.onAdd} />
      <Inspect className={className} />
    </aside>
  );
}

function ModeBar({ viewport, state, onViewport, onState }: InspectorProps) {
  return (
    <div style={modeBar}>
      <div style={{ display: "flex", gap: 4 }}>
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
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
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
          Editing the{" "}
          {viewport !== "base" ? VIEWPORTS.find((v) => v.key === viewport)?.label : ""}
          {viewport !== "base" && state !== "default" ? " · " : ""}
          {state !== "default" ? "Hover" : ""} variant — base stays the default.
        </div>
      )}
    </div>
  );
}

interface FieldProps {
  facet: Facet;
  current: string | undefined;
  baseValue: string | undefined;
  scales: Scales;
  isBase: boolean;
  onSet: (key: string) => void;
  onReset: () => void;
}

function Field({
  facet,
  current,
  baseValue,
  scales,
  isBase,
  onSet,
  onReset,
}: FieldProps) {
  const overridden = isBase
    ? (current ?? "") !== (baseValue ?? "")
    : current !== undefined;
  const options = optionsOf(facet, scales);
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={fieldLabel}>{facet.label}</span>
        {overridden && <span title="Overridden" style={dot} />}
        {overridden && (
          <button type="button" onClick={onReset} style={resetBtn}>
            reset
          </button>
        )}
        {!isBase && !overridden && baseValue && (
          <span style={{ fontSize: 11, color: "#b3b3b3" }}>
            inherits {labelFor(options, baseValue)}
          </span>
        )}
      </div>
      {facet.render === "swatch" ? (
        <Swatches options={options} current={current} onSet={onSet} />
      ) : (
        <Steps options={options} current={current} onSet={onSet} />
      )}
    </div>
  );
}

const labelFor = (options: Option[], key: string) =>
  options.find((o) => o.key === key)?.label ?? key;

function Swatches({
  options,
  current,
  onSet,
}: {
  options: Option[];
  current?: string;
  onSet: (k: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          title={opt.label}
          onClick={() => onSet(current === opt.key ? "" : opt.key)}
          style={{
            ...swatch,
            background: opt.preview,
            outline:
              current === opt.key
                ? `2px solid ${ACCENT}`
                : "1px solid rgba(0,0,0,0.14)",
          }}
        />
      ))}
    </div>
  );
}

function Steps({
  options,
  current,
  onSet,
}: {
  options: Option[];
  current?: string;
  onSet: (k: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {options.map((opt) => {
        const on = current === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onSet(on ? "" : opt.key)}
            style={{ ...segment, ...(on ? segmentOn : {}) }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function AddProperty({
  shownIds,
  onAdd,
}: {
  shownIds: string[];
  onAdd: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = FACETS.filter((f) => !shownIds.includes(f.id));
  if (available.length === 0) return null;
  return (
    <div style={{ marginTop: 4 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={addBtn}>
        {open ? "× Close" : "+ Add property"}
      </button>
      {open && (
        <div style={addMenu}>
          {GROUPS.filter((g) => available.some((f) => f.group === g)).map((group) => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div style={groupLabel}>{group}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {available
                  .filter((f) => f.group === group)
                  .map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        onAdd(f.id);
                        setOpen(false);
                      }}
                      style={addItem}
                    >
                      {f.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Inspect({ className }: { className: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 10 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={inspectToggle}>
        {open ? "▾" : "▸"} Inspect (Tailwind classes)
      </button>
      {open && <code style={readout}>{className || "—"}</code>}
    </div>
  );
}

const panel: Record<string, string | number> = {
  width: 290,
  flex: "0 0 290px",
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
const groupLabel = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: ACCENT,
  marginBottom: 7,
  fontWeight: 600,
} as const;
const fieldLabel = { fontSize: 12, color: "#555" } as const;
const dot = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#e0512f",
  display: "inline-block",
} as const;
const resetBtn = {
  fontSize: 10,
  color: "#999",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  textDecoration: "underline",
} as const;
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
const segmentOn = { background: ACCENT, borderColor: ACCENT, color: "#fff" } as const;
const chipBtn = (on: boolean) =>
  ({
    flex: 1,
    fontSize: 12,
    padding: "5px 8px",
    borderRadius: 6,
    border: "1px solid",
    borderColor: on ? ACCENT : "#dcdce3",
    background: on ? "#fff" : "transparent",
    color: on ? ACCENT : "#777",
    fontWeight: on ? 600 : 400,
    cursor: "pointer",
  }) as const;
const addBtn = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 6,
  border: `1px dashed ${ACCENT}`,
  background: "#fff",
  color: ACCENT,
  cursor: "pointer",
  width: "100%",
} as const;
const addMenu = {
  marginTop: 8,
  padding: 10,
  border: "1px solid #eee",
  borderRadius: 8,
  background: "#fbfbfd",
} as const;
const addItem = {
  fontSize: 12,
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid #e0e0e6",
  background: "#fff",
  color: "#333",
  cursor: "pointer",
} as const;
const inspectToggle = {
  fontSize: 11,
  color: "#999",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
} as const;
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
