import {
  CAP,
  type Capability,
  COLOR_TARGETS,
  relevantFor,
} from "@nocms/style-controls";
import { useMemo, useState } from "preact/hooks";
import {
  currentClass,
  FEATURE,
  featureIdOf,
  preferNamed,
  scaleKeys,
  searchFeatures,
} from "./catalog";
import { ColorConfigurator } from "./configurator";

const ACCENT = "#3b5bdb";

interface Ctx {
  className: string;
  variant: string;
  onApply: (cls: string, featureId: string) => void;
}

// ── Widget archetypes (compact; a real control, never a list of class-buttons) ───────────────────

function Slider({
  feature,
  label,
  ctx,
}: {
  feature: string;
  label?: string;
  ctx: Ctx;
}) {
  const f = FEATURE.get(feature);
  if (!f) return null;
  const cur = currentClass(ctx.className, feature, ctx.variant);
  const opts = useMemo(() => {
    const sorted = [...f.options].sort((a, b) => a.order - b.order);
    return preferNamed(sorted, (o) =>
      o.cls.startsWith(f.prefix) ? o.cls.slice(f.prefix.length) : o.cls,
    );
  }, [feature]);
  const idx = opts.findIndex((o) => o.cls === cur);
  return (
    <Row label={label ?? f.label} value={idx >= 0 ? opts[idx]?.label : undefined}>
      <input
        type="range"
        min={0}
        max={opts.length - 1}
        value={idx < 0 ? 0 : idx}
        onInput={(e) => {
          const o = opts[Number((e.target as HTMLInputElement).value)];
          if (o) ctx.onApply(cur === o.cls ? "" : o.cls, feature);
        }}
        style={{ flex: 1 }}
      />
      {idx >= 0 && <Clear onClick={() => cur && ctx.onApply("", feature)} />}
    </Row>
  );
}

function Dropdown({
  feature,
  label,
  ctx,
}: {
  feature: string;
  label?: string;
  ctx: Ctx;
}) {
  const f = FEATURE.get(feature);
  if (!f) return null;
  const cur = currentClass(ctx.className, feature, ctx.variant) ?? "";
  return (
    <Row label={label ?? f.label}>
      <select
        value={cur}
        onChange={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          ctx.onApply(v, feature);
        }}
        style={select}
      >
        <option value="">—</option>
        {f.options.map((o) => (
          <option key={o.cls} value={o.cls}>
            {o.label}
          </option>
        ))}
      </select>
    </Row>
  );
}

function Segmented({
  feature,
  label,
  ctx,
}: {
  feature: string;
  label?: string;
  ctx: Ctx;
}) {
  const f = FEATURE.get(feature);
  if (!f) return null;
  const cur = currentClass(ctx.className, feature, ctx.variant);
  return (
    <Row label={label ?? f.label} stack>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {f.options.slice(0, 8).map((o) => (
          <button
            key={o.cls}
            type="button"
            onClick={() => ctx.onApply(cur === o.cls ? "" : o.cls, feature)}
            style={{ ...seg, ...(cur === o.cls ? segOn : {}) }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Row>
  );
}

function Toggle({
  onCls,
  feature,
  label,
  ctx,
}: {
  onCls: string;
  feature: string;
  label: string;
  ctx: Ctx;
}) {
  const on = currentClass(ctx.className, feature, ctx.variant) === onCls;
  return (
    <Row label={label}>
      <button
        type="button"
        onClick={() => ctx.onApply(on ? "" : onCls, feature)}
        style={{ ...seg, ...(on ? segOn : {}), minWidth: 44 }}
      >
        {on ? "On" : "Off"}
      </button>
    </Row>
  );
}

const SIDES = [
  { key: "t", grid: "1 / 2 / 2 / 3" },
  { key: "r", grid: "2 / 3 / 3 / 4" },
  { key: "b", grid: "3 / 2 / 4 / 3" },
  { key: "l", grid: "2 / 1 / 3 / 2" },
  { key: "all", grid: "2 / 2 / 3 / 3" },
];
const CORNERS = [
  { key: "tl", grid: "1 / 1 / 2 / 2" },
  { key: "tr", grid: "1 / 3 / 2 / 4" },
  { key: "br", grid: "3 / 3 / 4 / 4" },
  { key: "bl", grid: "3 / 1 / 4 / 2" },
  { key: "all", grid: "2 / 2 / 3 / 3" },
];

// Visual side/corner picker + one amount slider — the target dimension as a box you click, the
// value as a single knob. One control covers padding-on-any-side, etc.
function BoxControl({
  targets,
  scaleFeature,
  label,
  kind,
  ctx,
}: {
  targets: Record<string, string>;
  scaleFeature: string;
  label: string;
  kind: "sides" | "corners";
  ctx: Ctx;
}) {
  const [sel, setSel] = useState("all");
  const slots = kind === "sides" ? SIDES : CORNERS;
  const prefix = targets[sel] ?? "";
  const scale = useMemo(
    () =>
      preferNamed(
        scaleKeys(scaleFeature).sort((a, b) => a.order - b.order),
        (s) => s.key,
      ),
    [scaleFeature],
  );
  const curUtil = currentForPrefix(
    ctx.className,
    prefix,
    ctx.variant,
    scale.map((s) => s.key),
  );
  const idx = scale.findIndex((s) => s.key === curUtil);
  return (
    <Row label={label} stack>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "10px 30px 10px",
            gridTemplateRows: "10px 22px 10px",
            gap: 2,
            width: 50,
          }}
        >
          {slots.map((s) => (
            <button
              key={s.key}
              type="button"
              title={s.key}
              onClick={() => setSel(s.key)}
              style={{
                gridArea: s.grid,
                border: "1px solid",
                borderColor: sel === s.key ? ACCENT : "#d5d5dd",
                background:
                  sel === s.key ? ACCENT : s.key === "all" ? "#f0f0f4" : "#fafafa",
                borderRadius: kind === "corners" ? 4 : 2,
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{ fontSize: 11, color: idx >= 0 ? ACCENT : "#bbb", marginBottom: 2 }}
          >
            {idx >= 0 ? scale[idx]?.label : "—"}
          </div>
          <input
            type="range"
            min={0}
            max={scale.length - 1}
            value={idx < 0 ? 0 : idx}
            onInput={(e) => {
              const s = scale[Number((e.target as HTMLInputElement).value)];
              if (!s) return;
              const cls = `${prefix}${s.key}`;
              ctx.onApply(curUtil === s.key ? "" : cls, featureIdOf(cls));
            }}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </Row>
  );
}

function ColorControl({ ctx }: { ctx: Ctx }) {
  const [t, setT] = useState(0);
  const target = COLOR_TARGETS[t] ?? COLOR_TARGETS[0];
  if (!target) return null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={dim}>Color</span>
        <select
          value={String(t)}
          onChange={(e) => setT(Number((e.target as HTMLSelectElement).value))}
          style={select}
        >
          {COLOR_TARGETS.map((c, i) => (
            <option key={c.prefix} value={String(i)}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <ColorConfigurator
        prefix={target.prefix}
        label={target.label}
        className={ctx.className}
        variant={ctx.variant}
        onApply={ctx.onApply}
      />
    </div>
  );
}

function currentForPrefix(
  className: string,
  prefix: string,
  variant: string,
  keys: string[],
): string | undefined {
  for (const cls of className.split(/\s+/).filter(Boolean)) {
    const i = cls.lastIndexOf(":");
    const v = i === -1 ? "" : cls.slice(0, i + 1);
    const util = i === -1 ? cls : cls.slice(i + 1);
    if (v === variant && util.startsWith(prefix)) {
      const k = util.slice(prefix.length);
      if (keys.includes(k)) return k;
    }
  }
  return undefined;
}

// ── Renderers ────────────────────────────────────────────────────────────────────────────────────

function CapabilityPanel({ cap, ctx }: { cap: Capability; ctx: Ctx }) {
  return (
    <section style={panel}>
      <div style={capLabel}>{cap.label}</div>
      {cap.controls.map((c, i) => {
        const key = `${cap.id}-${i}`;
        if (c.kind === "color") return <ColorControl key={key} ctx={ctx} />;
        if (c.kind === "box")
          return (
            <BoxControl
              key={key}
              targets={c.targets}
              scaleFeature={c.scale}
              label={c.label}
              kind={c.box}
              ctx={ctx}
            />
          );
        if (c.kind === "toggle")
          return (
            <Toggle
              key={key}
              feature={c.feature}
              onCls={c.on}
              label={c.label}
              ctx={ctx}
            />
          );
        if (c.kind === "slider")
          return <Slider key={key} feature={c.feature} label={c.label} ctx={ctx} />;
        if (c.kind === "dropdown")
          return <Dropdown key={key} feature={c.feature} label={c.label} ctx={ctx} />;
        return <Segmented key={key} feature={c.feature} label={c.label} ctx={ctx} />;
      })}
    </section>
  );
}

export function CapabilityBrowser({
  tag,
  className,
  variant,
  onApply,
}: {
  tag: string;
  className: string;
  variant: string;
  onApply: (cls: string, featureId: string) => void;
}) {
  const ctx: Ctx = { className, variant, onApply };
  const relevant = useMemo(() => relevantFor(tag), [tag]);
  const [q, setQ] = useState("");
  const shown = relevant.map((id) => CAP.get(id)).filter(Boolean) as Capability[];
  // Search reaches *every* property the engine knows — each rendered as a real control. So nothing
  // is left behind: curated capabilities are the guided surface, search is the guaranteed path.
  const matches = useMemo(() => searchFeatures(q, null, 16), [q]);

  return (
    <div>
      {shown.map((cap) => (
        <CapabilityPanel key={cap.id} cap={cap} ctx={ctx} />
      ))}
      <input
        value={q}
        onInput={(e) => setQ((e.target as HTMLInputElement).value)}
        placeholder={`Search any of ${FEATURE.size} properties…`}
        style={search}
      />
      {q && (
        <div style={{ marginTop: 8 }}>
          {matches.length === 0 && (
            <div style={{ fontSize: 11.5, color: "#999" }}>No matching property.</div>
          )}
          {matches.map((f) => (
            <GenericControl key={f.id} feature={f.id} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  );
}

// The universal path: any feature → the right widget for its type, so every one of the engine's
// properties is reachable and editable, not just the curated ones.
function GenericControl({ feature, ctx }: { feature: string; ctx: Ctx }) {
  const f = FEATURE.get(feature);
  if (!f) return null;
  if (f.control === "color") return <SwatchList feature={feature} ctx={ctx} />;
  if (f.control === "enum")
    return f.options.length > 5 ? (
      <Dropdown feature={feature} ctx={ctx} />
    ) : (
      <Segmented feature={feature} ctx={ctx} />
    );
  return <Slider feature={feature} ctx={ctx} />;
}

function SwatchList({ feature, ctx }: { feature: string; ctx: Ctx }) {
  const f = FEATURE.get(feature);
  if (!f) return null;
  const cur = currentClass(ctx.className, feature, ctx.variant);
  return (
    <Row label={f.label} stack>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {f.options.slice(0, 40).map((o) => (
          <button
            key={o.cls}
            type="button"
            title={o.value}
            onClick={() => ctx.onApply(cur === o.cls ? "" : o.cls, feature)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              padding: 0,
              cursor: "pointer",
              background: o.value,
              outline:
                cur === o.cls ? `2px solid ${ACCENT}` : "1px solid rgba(0,0,0,0.14)",
            }}
          />
        ))}
      </div>
    </Row>
  );
}

function Row({
  label,
  value,
  children,
  stack,
}: {
  label: string;
  value?: string;
  children: preact.ComponentChildren;
  stack?: boolean;
}) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: stack ? 5 : 0,
        }}
      >
        <span style={dim}>{label}</span>
        {value !== undefined && (
          <span style={{ fontSize: 11, color: ACCENT }}>{value}</span>
        )}
      </div>
      {stack ? (
        children
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
      )}
    </div>
  );
}
const Clear = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    title="Clear"
    style={{
      fontSize: 12,
      color: "#aaa",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
    }}
  >
    ×
  </button>
);

const panel = { marginBottom: 14 } as const;
const capLabel = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: ACCENT,
  marginBottom: 8,
  fontWeight: 600,
} as const;
const dim = { fontSize: 12, color: "#444" } as const;
const seg = {
  fontSize: 11.5,
  padding: "3px 8px",
  borderRadius: 5,
  border: "1px solid #e0e0e6",
  background: "#fff",
  color: "#333",
  cursor: "pointer",
} as const;
const segOn = { background: ACCENT, borderColor: ACCENT, color: "#fff" } as const;
const select = {
  fontSize: 12,
  padding: "3px 6px",
  borderRadius: 5,
  border: "1px solid #dcdce3",
  background: "#fff",
  color: "#333",
  flex: 1,
  minWidth: 0,
  maxWidth: "100%",
} as const;
const search = {
  width: "100%",
  boxSizing: "border-box",
  fontSize: 12,
  padding: "6px 9px",
  borderRadius: 6,
  border: "1px dashed #ccd",
  marginTop: 4,
  color: "#555",
} as const;
