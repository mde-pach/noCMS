import {
  STATES,
  type StateKey,
  VIEWPORTS,
  type ViewportKey,
  variantOf,
} from "@nocms/style-controls";
import { useState } from "preact/hooks";
import { CapabilityBrowser } from "./capabilities";
import { applyClass } from "./catalog";

const ACCENT = "#3b5bdb";

// The interaction state being authored persists across selections (Figma keeps the active state);
// module scope survives the panel unmounting when nothing is selected. The viewport axis is *not*
// here — it's the editor's top-bar breakpoint, passed in as `viewport`, so canvas width and the
// styled breakpoint are a single choice.
let stateMode: StateKey = "default";

interface StylePanelProps {
  /** the rendered DOM root tag of the selection (e.g. `"section"`), used to pick tag-relevant
   *  controls. The editor resolves this from the painted element, not the JSX/component name. */
  tag: string;
  /** active editor viewport id (a Tailwind viewport key) — the breakpoint being previewed. */
  viewport: string;
  getClass: () => string;
  setClass: (cls: string) => void;
}

// The site's element-level styling panel. The styled variant is (top-bar viewport × local state);
// every control reads and writes classes *for that variant*, so one element carries a full
// responsive + interaction-state ruleset and the engine compiles each.
export function StylePanel({ tag, viewport, getClass, setClass }: StylePanelProps) {
  const [st, setSt] = useState<StateKey>(stateMode);
  const variant = variantOf(viewport as ViewportKey, st);
  const className = getClass();
  const vpLabel = VIEWPORTS.find((v) => v.key === viewport)?.label;

  const pick = (next: StateKey) => {
    stateMode = next;
    setSt(next);
  };

  return (
    <div>
      <ModeBar st={st} viewportLabel={vpLabel} onPick={pick} />
      <CapabilityBrowser
        tag={tag}
        className={className}
        variant={variant}
        onApply={(cls, featureId) =>
          setClass(applyClass(className, cls, featureId, variant))
        }
      />
    </div>
  );
}

function ModeBar({
  st,
  viewportLabel,
  onPick,
}: {
  st: StateKey;
  viewportLabel: string | undefined;
  onPick: (next: StateKey) => void;
}) {
  const isBase = !viewportLabel || viewportLabel === "Base";
  return (
    <section style={bar}>
      <div style={hint}>
        Styling <strong style={{ color: ACCENT }}>{viewportLabel ?? "Base"}</strong>
        {isBase ? " · all screens" : " and up"}
      </div>
      <Segments
        items={STATES.map((s) => ({ key: s.key, label: s.label }))}
        active={st}
        onPick={(key) => onPick(key as StateKey)}
      />
    </section>
  );
}

function Segments({
  items,
  active,
  onPick,
}: {
  items: { key: string; label: string }[];
  active: string;
  onPick: (key: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onPick(it.key)}
          style={{ ...seg, ...(active === it.key ? segOn : {}) }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

const bar = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  paddingBottom: 10,
  marginBottom: 10,
  borderBottom: "1px solid #ececf2",
} as const;
const hint = { fontSize: 11, color: "#888" } as const;
const seg = {
  fontSize: 11,
  padding: "3px 7px",
  borderRadius: 5,
  border: "1px solid #e0e0e6",
  background: "#fff",
  color: "#555",
  cursor: "pointer",
} as const;
const segOn = { background: ACCENT, borderColor: ACCENT, color: "#fff" } as const;
