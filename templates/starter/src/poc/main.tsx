import { parseTokens, toCssVariables } from "@nocms/tokens";
import type { JSX } from "preact";
import { render } from "preact";
import { useState } from "preact/hooks";
import pocTokens from "../../poc.tokens?raw";
import { applyClass, flattenForPreview } from "./catalog";
import { Inspector } from "./inspector";
import {
  previewOrder,
  type StateKey,
  type ViewportKey,
  variantOf,
  viewportWidth,
} from "./modes";
import { toTailwindTheme } from "./theme";

const ACCENT = "#3b5bdb";
const tokens = parseTokens(pocTokens);

const vars = document.createElement("style");
vars.textContent = toCssVariables(tokens);
document.head.appendChild(vars);

const theme = document.createElement("style");
theme.setAttribute("type", "text/tailwindcss");
theme.textContent = toTailwindTheme(tokens);
document.head.appendChild(theme);

interface CanvasNode {
  id: string;
  label: string;
  tag: keyof JSX.IntrinsicElements;
  classes: string;
  /** The classes the component shipped with — its default editable surface. */
  defaultClasses: string;
  style?: JSX.CSSProperties;
  text?: string;
  children?: CanvasNode[];
}

// A realistic example: every token-bound style is a Tailwind utility the inspector drives;
// structural CSS (size, weight, layout) stays inline so the demo reads like a real component.
const CARD: Omit<CanvasNode, "defaultClasses"> = {
  id: "card",
  label: "Card",
  tag: "section",
  classes: "bg-surface p-xl rounded-lg shadow-md gap-lg",
  style: { maxWidth: "400px", display: "flex", flexDirection: "column" },
  children: [
    {
      id: "eyebrow",
      label: "Eyebrow",
      tag: "div",
      classes: "text-accent-500 font-heading tracking-wide",
      style: { fontSize: "13px", fontWeight: 600, textTransform: "uppercase" },
      text: "Starter plan",
    },
    {
      id: "title",
      label: "Title",
      tag: "h2",
      classes: "text-ink font-heading",
      style: { fontSize: "30px", fontWeight: 600, margin: 0 },
      text: "Everything you need to ship",
    },
    {
      id: "price",
      label: "Price",
      tag: "div",
      classes: "text-brand-600 font-heading",
      style: { fontSize: "40px", fontWeight: 700 },
      text: "$0",
    },
    {
      id: "desc",
      label: "Description",
      tag: "p",
      classes: "text-muted",
      style: { margin: 0, lineHeight: 1.6 },
      text: "Fork the repo, edit in-site, publish in one click. No build, no backend.",
    },
    {
      id: "cta",
      label: "Button",
      tag: "button",
      classes: "bg-brand-500 text-paper px-lg py-md rounded-md font-body",
      style: {
        border: "none",
        fontSize: "15px",
        fontWeight: 600,
        cursor: "pointer",
        alignSelf: "flex-start",
      },
      text: "Get started",
    },
  ],
} as Omit<CanvasNode, "defaultClasses">;

function withDefaults(node: Omit<CanvasNode, "defaultClasses">): CanvasNode {
  return {
    ...node,
    defaultClasses: node.classes,
    children: node.children?.map((c) => withDefaults(c)),
  };
}

function find(node: CanvasNode, id: string): CanvasNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const hit = find(child, id);
    if (hit) return hit;
  }
  return undefined;
}

function withClasses(node: CanvasNode, id: string, classes: string): CanvasNode {
  if (node.id === id) return { ...node, classes };
  if (!node.children) return node;
  return { ...node, children: node.children.map((c) => withClasses(c, id, classes)) };
}

interface NodeProps {
  node: CanvasNode;
  selectedId: string;
  hoveredId: string | undefined;
  order: string[];
  interactive: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | undefined) => void;
}

function Node({
  node,
  selectedId,
  hoveredId,
  order,
  interactive,
  onSelect,
  onHover,
}: NodeProps) {
  const Tag = node.tag as "div";
  const selected = !interactive && node.id === selectedId;
  const hovered = !interactive && node.id === hoveredId && node.id !== selectedId;
  // Interact mode hands the real component back to the browser: raw classes (so real `:hover`/`md:`
  // fire natively) and no editor overlay or click-capture.
  return (
    <Tag
      class={interactive ? node.classes : flattenForPreview(node.classes, order)}
      style={{
        ...node.style,
        outline: selected
          ? `2px solid ${ACCENT}`
          : hovered
            ? "1.5px solid rgba(59,91,219,0.4)"
            : undefined,
        outlineOffset: "3px",
        cursor: interactive ? undefined : "pointer",
      }}
      onClick={
        interactive
          ? undefined
          : (e) => {
              e.stopPropagation();
              onSelect(node.id);
            }
      }
      onMouseOver={
        interactive
          ? undefined
          : (e) => {
              e.stopPropagation();
              onHover(node.id);
            }
      }
      onMouseOut={interactive ? undefined : () => onHover(undefined)}
    >
      {node.text}
      {node.children?.map((c) => (
        <Node
          key={c.id}
          node={c}
          selectedId={selectedId}
          hoveredId={hoveredId}
          order={order}
          interactive={interactive}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </Tag>
  );
}

function App() {
  const [tree, setTree] = useState(() => withDefaults(CARD));
  const [selectedId, setSelectedId] = useState("card");
  const [hoveredId, setHoveredId] = useState<string | undefined>();
  const [viewport, setViewport] = useState<ViewportKey>("base");
  const [state, setState] = useState<StateKey>("default");
  const [interactive, setInteractive] = useState(false);

  const selected = find(tree, selectedId) ?? tree;
  const order = previewOrder(viewport, state);

  return (
    <div
      style={{
        display: "flex",
        gap: "28px",
        alignItems: "flex-start",
        padding: "32px",
        minHeight: "100vh",
        background: "#eef0f4",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#8a8a8a" }}>
            {viewportWidth(viewport)}px preview
          </span>
          <button
            type="button"
            onClick={() => setInteractive((i) => !i)}
            title={
              interactive
                ? "Back to editing"
                : "Interact with the real component (real hover, clicks)"
            }
            style={{
              fontSize: 12,
              padding: "5px 12px",
              borderRadius: 999,
              border: `1px solid ${interactive ? "#e0512f" : "#cfcfd6"}`,
              background: interactive ? "#e0512f" : "#fff",
              color: interactive ? "#fff" : "#555",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {interactive ? "● Interacting — click to edit" : "▶ Preview / interact"}
          </button>
        </div>
        <div
          style={{
            width: viewportWidth(viewport),
            maxWidth: "100%",
            background: "#dfe3ea",
            borderRadius: 14,
            padding: "28px 20px",
            display: "flex",
            justifyContent: "center",
            transition: "width 160ms ease",
          }}
        >
          <Node
            node={tree}
            selectedId={selectedId}
            hoveredId={hoveredId}
            order={order}
            interactive={interactive}
            onSelect={setSelectedId}
            onHover={setHoveredId}
          />
        </div>
      </div>
      <Inspector
        label={selected.label}
        tag={selected.tag}
        className={selected.classes}
        viewport={viewport}
        state={state}
        onApplyClass={(cls, featureId) => {
          setTree((t) => {
            const node = find(t, selectedId);
            return withClasses(
              t,
              selectedId,
              applyClass(
                node?.classes ?? "",
                cls,
                featureId,
                variantOf(viewport, state),
              ),
            );
          });
        }}
        onViewport={setViewport}
        onState={setState}
      />
    </div>
  );
}

const host = document.getElementById("poc");
if (host) render(<App />, host);

await import("@tailwindcss/browser");
