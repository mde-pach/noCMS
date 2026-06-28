import {
  COLORS,
  type ColorFamily,
  type ColorShade,
  colorFeatureId,
  composeColor,
  currentClass,
  parseColorClass,
} from "./catalog";

const ACCENT = "#3b5bdb";

const keyOf = (f: ColorFamily, s: ColorShade) =>
  s.shade ? `${f.name}-${s.shade}` : f.name;
const repr = (f: ColorFamily) =>
  f.shades.find((s) => s.shade === "500") ??
  f.shades[Math.floor(f.shades.length / 2)] ??
  f.shades[0];
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// A configurator, not a class list: the colour *dimensions* (family → shade → opacity) compose to
// generate `bg-brand-600/40` and the whole colour space. "Applies on" (breakpoint/state) is the
// shared variant dimension, already set by the mode bar above — so it isn't repeated here.
export function ColorConfigurator({
  prefix,
  label,
  className,
  variant,
  onApply,
}: {
  prefix: string;
  label: string;
  className: string;
  variant: string;
  onApply: (cls: string, featureId: string) => void;
}) {
  const featureId = colorFeatureId(prefix);
  const parsed = parseColorClass(currentClass(className, featureId, variant), prefix);
  const selectedKey = parsed?.key;
  const opacity = parsed?.opacity ?? 100;

  const family = selectedKey
    ? COLORS.find((f) => f.shades.some((s) => keyOf(f, s) === selectedKey))
    : undefined;
  const isArb = !!selectedKey?.startsWith("[");
  const innerHex = isArb ? (selectedKey as string).slice(1, -1) : "#000000";
  const set = (key: string, op = opacity) =>
    onApply(key ? composeColor(prefix, key, op) : "", featureId);

  const tokens = COLORS.filter((f) => f.isToken);
  const palette = COLORS.filter((f) => !f.isToken);

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={dim}>{label} color</div>

      <div style={subLabel}>Color</div>
      <Swatches
        families={tokens}
        family={family}
        onPick={(f) => set(keyOf(f, repr(f) as ColorShade))}
      />
      {family && (
        <button type="button" onClick={() => set("")} style={clearBtn}>
          clear
        </button>
      )}

      <div style={{ ...subLabel, marginTop: 8 }}>Palette</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
        <Swatches
          families={palette}
          family={family}
          onPick={(f) => set(keyOf(f, repr(f) as ColorShade))}
        />
        <label
          title="Custom colour"
          style={{
            ...sw,
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: isArb ? innerHex : "#fff",
            border: "1px dashed #bbb",
            outline: isArb ? `2px solid ${ACCENT}` : "none",
            cursor: "pointer",
          }}
        >
          {!isArb && (
            <span style={{ fontSize: 15, color: "#aaa", lineHeight: 1 }}>+</span>
          )}
          <input
            type="color"
            value={isArb ? innerHex : "#000000"}
            onInput={(e) =>
              onApply(`${prefix}[${(e.target as HTMLInputElement).value}]`, featureId)
            }
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
          />
        </label>
      </div>

      {family && family.shades.length > 1 && (
        <>
          <div style={{ ...subLabel, marginTop: 10 }}>Shade</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {family.shades.map((s) => (
              <button
                key={s.cls}
                type="button"
                title={s.shade ?? family.name}
                onClick={() => set(keyOf(family, s))}
                style={{
                  ...shade,
                  background: s.value,
                  outline:
                    keyOf(family, s) === selectedKey
                      ? `2px solid ${ACCENT}`
                      : "1px solid rgba(0,0,0,0.12)",
                }}
              />
            ))}
          </div>
        </>
      )}

      <div style={{ ...subLabel, marginTop: 10, opacity: family ? 1 : 0.4 }}>
        Opacity · {opacity}%
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={opacity}
        disabled={!family}
        onInput={(e) =>
          selectedKey && set(selectedKey, Number((e.target as HTMLInputElement).value))
        }
        style={{ width: "100%" }}
      />

      <div style={generates}>
        {family
          ? `generates  ${variant}${composeColor(prefix, selectedKey ?? "", opacity)}`
          : "no color set"}
      </div>
    </div>
  );
}

function Swatches({
  families,
  family,
  onPick,
}: {
  families: ColorFamily[];
  family: ColorFamily | undefined;
  onPick: (f: ColorFamily) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {families.map((f) => (
        <button
          key={f.name}
          type="button"
          title={title(f.name)}
          onClick={() => onPick(f)}
          style={{
            ...sw,
            background: repr(f)?.value,
            outline:
              family?.name === f.name
                ? `2px solid ${ACCENT}`
                : "1px solid rgba(0,0,0,0.14)",
          }}
        />
      ))}
    </div>
  );
}

const dim = { fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 8 } as const;
const subLabel = { fontSize: 11, color: "#888", marginBottom: 5 } as const;
const sw = {
  width: 26,
  height: 26,
  borderRadius: 6,
  cursor: "pointer",
  padding: 0,
} as const;
const shade = {
  width: 22,
  height: 22,
  borderRadius: 5,
  cursor: "pointer",
  padding: 0,
} as const;
const clearBtn = {
  fontSize: 10,
  color: "#999",
  background: "none",
  border: "none",
  cursor: "pointer",
  textDecoration: "underline",
  marginTop: 4,
  padding: 0,
} as const;
const generates = {
  fontSize: 10.5,
  color: "#b0b0b0",
  marginTop: 10,
  fontFamily: "ui-monospace, monospace",
} as const;
