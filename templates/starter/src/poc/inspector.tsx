import { useState } from "preact/hooks";
import {
  applyFacet,
  customInner,
  FACETS,
  type Facet,
  isCustomValue,
  type Option,
  optionsOf,
  parseClasses,
  type Scales,
} from "./facets";
import { STATES, type StateKey, VIEWPORTS, type ViewportKey, variantOf } from "./modes";
import { Palette } from "./palette";

const GROUPS = ["Color", "Spacing", "Border", "Type", "Effects", "Motion"] as const;
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
  onApplyClass: (cls: string, root: string) => void;
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

      <Palette className={className} variant={variant} onApply={props.onApplyClass} />
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
  const [help, setHelp] = useState(false);
  const overridden = isBase
    ? (current ?? "") !== (baseValue ?? "")
    : current !== undefined;
  const options = optionsOf(facet, scales);
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={fieldLabel}>{facet.label}</span>
        {facet.hint && (
          <button
            type="button"
            title="What's this?"
            onClick={() => setHelp((h) => !h)}
            style={infoBtn(help)}
          >
            i
          </button>
        )}
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

      {help && facet.hint && (
        <div style={helpBox}>
          <div>{facet.hint}</div>
          {facet.example && (
            <div style={{ color: "#777", marginTop: 4 }}>e.g. {facet.example}</div>
          )}
          {facet.doc && (
            <a
              href={facet.doc}
              target="_blank"
              rel="noreferrer"
              style={{ color: ACCENT, fontSize: 11 }}
            >
              Tailwind docs ↗
            </a>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: facet.render === "swatch" ? 6 : 4,
          alignItems: "center",
        }}
      >
        {facet.render === "swatch" ? (
          <Swatches options={options} current={current} onSet={onSet} />
        ) : (
          <Steps options={options} current={current} onSet={onSet} />
        )}
        {facet.custom === "color" && <CustomColor current={current} onSet={onSet} />}
        {facet.custom === "length" && (
          <CustomLength key={current ?? ""} current={current} onSet={onSet} />
        )}
      </div>
    </div>
  );
}

const labelFor = (options: Option[], key: string) =>
  isCustomValue(key)
    ? customInner(key)
    : (options.find((o) => o.key === key)?.label ?? key);

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
    <>
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
    </>
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
    <>
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
    </>
  );
}

function CustomColor({
  current,
  onSet,
}: {
  current?: string;
  onSet: (k: string) => void;
}) {
  const active = isCustomValue(current ?? "");
  return (
    <label
      title="Custom colour"
      style={{
        ...swatch,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? customInner(current ?? "") : "#fff",
        border: "1px dashed #bbb",
        outline: active ? `2px solid ${ACCENT}` : "none",
        cursor: "pointer",
      }}
    >
      {!active && <span style={{ fontSize: 15, color: "#aaa", lineHeight: 1 }}>+</span>}
      <input
        type="color"
        value={active ? customInner(current ?? "") : "#000000"}
        onInput={(e) => onSet(`[${(e.target as HTMLInputElement).value}]`)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
      />
    </label>
  );
}

function CustomLength({
  current,
  onSet,
}: {
  current?: string;
  onSet: (k: string) => void;
}) {
  const active = isCustomValue(current ?? "");
  const [v, setV] = useState(active ? customInner(current ?? "") : "");
  const commit = () => onSet(v.trim() ? `[${v.trim()}]` : "");
  return (
    <input
      value={v}
      placeholder="custom"
      onInput={(e) => setV((e.target as HTMLInputElement).value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      style={{ ...segment, width: 62, ...(active ? segmentOn : {}) }}
    />
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
  width: 300,
  flex: "0 0 300px",
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
const infoBtn = (on: boolean) =>
  ({
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "1px solid",
    borderColor: on ? ACCENT : "#cfcfd6",
    background: on ? ACCENT : "transparent",
    color: on ? "#fff" : "#9a9aa2",
    fontSize: 9,
    fontStyle: "italic",
    fontFamily: "Georgia, serif",
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
  }) as const;
const helpBox = {
  fontSize: 11.5,
  color: "#555",
  background: "#f6f7fb",
  borderRadius: 6,
  padding: "7px 9px",
  marginBottom: 6,
  lineHeight: 1.45,
  display: "flex",
  flexDirection: "column",
  gap: 2,
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
