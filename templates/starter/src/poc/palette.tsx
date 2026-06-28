import { useMemo, useState } from "preact/hooks";
import { CATALOG, type Feature, groupCounts, searchFeatures } from "./catalog";
import { ColorConfigurator, ValueConfigurator } from "./configurator";

const ACCENT = "#3b5bdb";
const COLOR_GROUP = "Color & fill";
const COLOR_PROPS = [
  { prefix: "bg-", label: "Background", fid: "background-color" },
  { prefix: "text-", label: "Text", fid: "color" },
  { prefix: "border-", label: "Border", fid: "border-color" },
];
const COLOR_FIDS = new Set(COLOR_PROPS.map((p) => p.fid));

// "Add anything": the whole Tailwind surface as a clean hierarchy of approaches → configurators.
// Each property is a generator (a few knobs), never a list of classes.
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
  const [colorProp, setColorProp] = useState("bg-");
  const counts = useMemo(() => groupCounts(), []);
  const found = useMemo(() => searchFeatures(q, null), [q]);
  const inGroup = useMemo(
    () => (group ? CATALOG.features.filter((f) => f.group === group) : []),
    [group],
  );

  const cfg = (f: Feature) => (
    <ValueConfigurator
      key={f.id}
      feature={f}
      className={className}
      variant={variant}
      onApply={onApply}
    />
  );

  return (
    <div style={{ marginTop: 4 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={addBtn}>
        {open ? "× Close" : "+ Add anything"}
      </button>
      {open && (
        <div style={menu}>
          <input
            value={q}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
            placeholder="Search a property — border, shadow, rotate…"
            style={input}
          />
          {!q && (
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}
            >
              {counts.map((c) => (
                <button
                  key={c.group}
                  type="button"
                  onClick={() => setGroup(group === c.group ? null : c.group)}
                  style={chip(group === c.group)}
                >
                  {c.group}
                </button>
              ))}
            </div>
          )}

          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {q ? (
              found.length ? (
                found.map(cfg)
              ) : (
                <div style={note}>No matching property.</div>
              )
            ) : group === COLOR_GROUP ? (
              <>
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {COLOR_PROPS.map((p) => (
                    <button
                      key={p.prefix}
                      type="button"
                      onClick={() => setColorProp(p.prefix)}
                      style={subTab(colorProp === p.prefix)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <ColorConfigurator
                  prefix={colorProp}
                  label={COLOR_PROPS.find((p) => p.prefix === colorProp)?.label ?? ""}
                  className={className}
                  variant={variant}
                  onApply={onApply}
                />
                <div
                  style={{
                    ...note,
                    marginTop: 10,
                    borderTop: "1px solid #eee",
                    paddingTop: 8,
                  }}
                >
                  More colour properties
                </div>
                {inGroup.filter((f) => !COLOR_FIDS.has(f.id)).map(cfg)}
              </>
            ) : group ? (
              inGroup.map(cfg)
            ) : (
              <div style={note}>
                Pick a category or search — every property is a control here.
              </div>
            )}
          </div>
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
const subTab = (on: boolean) =>
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
const note = { fontSize: 11.5, color: "#999", padding: "2px" } as const;
