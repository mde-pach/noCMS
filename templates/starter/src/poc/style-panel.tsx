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

// The mode the user is editing — a viewport × state pair — persists across selections (and across the
// panel unmounting when nothing is selected), so switching elements keeps you "in Hover" the way Figma
// keeps the active state. Module scope, not component state, is what survives the unmount.
let mode: { vp: ViewportKey; st: StateKey } = { vp: "base", st: "default" };

interface StylePanelProps {
  /** the rendered DOM root tag of the selection (e.g. `"section"`), used to pick tag-relevant
   *  controls. The editor resolves this from the painted element, not the JSX/component name. */
  tag: string;
  getClass: () => string;
  setClass: (cls: string) => void;
}

// The site's element-level styling panel. The mode bar picks the variant (`md:hover:`); every control
// below reads and writes classes *for that variant*, so one element carries a full responsive +
// interaction-state ruleset and the engine compiles each.
export function StylePanel({ tag, getClass, setClass }: StylePanelProps) {
  const [vp, setVp] = useState<ViewportKey>(mode.vp);
  const [st, setSt] = useState<StateKey>(mode.st);
  const variant = variantOf(vp, st);
  const className = getClass();

  const pick = (next: Partial<{ vp: ViewportKey; st: StateKey }>) => {
    mode = { vp: next.vp ?? vp, st: next.st ?? st };
    if (next.vp) setVp(next.vp);
    if (next.st) setSt(next.st);
  };

  return (
    <div>
      <ModeBar vp={vp} st={st} onPick={pick} />
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
  vp,
  st,
  onPick,
}: {
  vp: ViewportKey;
  st: StateKey;
  onPick: (next: Partial<{ vp: ViewportKey; st: StateKey }>) => void;
}) {
  return (
    <section style={bar}>
      <Segments
        items={VIEWPORTS.map((v) => ({ key: v.key, label: v.label }))}
        active={vp}
        onPick={(key) => onPick({ vp: key as ViewportKey })}
      />
      <Segments
        items={STATES.map((s) => ({ key: s.key, label: s.label }))}
        active={st}
        onPick={(key) => onPick({ st: key as StateKey })}
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
  gap: 5,
  paddingBottom: 10,
  marginBottom: 10,
  borderBottom: "1px solid #ececf2",
} as const;
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
