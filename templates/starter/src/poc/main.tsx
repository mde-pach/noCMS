import { parseTokens, toCssVariables } from "@nocms/tokens";
import type { JSX } from "preact";
import { render } from "preact";
import { useMemo, useState } from "preact/hooks";
import themeTokens from "../../theme.tokens?raw";
import { deriveScales, parseClasses } from "./facets";
import { Inspector } from "./inspector";
import { toTailwindTheme } from "./theme";

const tokens = parseTokens(themeTokens);
const scales = deriveScales(tokens);

// noCMS runtime variables — the values Tailwind utilities resolve back to via the `@theme` bridge.
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
  style?: JSX.CSSProperties;
  text?: string;
  children?: CanvasNode[];
}

// A realistic example: every token-bound style is a Tailwind utility the inspector drives;
// structural CSS (size, weight, layout) stays inline so the demo reads like a real component.
const CARD: CanvasNode = {
  id: "card",
  label: "Card",
  tag: "section",
  classes: "bg-bg p-xl rounded-md gap-lg",
  style: {
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column",
    border: "1px solid color-mix(in srgb, var(--color-text) 12%, transparent)",
  },
  children: [
    {
      id: "eyebrow",
      label: "Eyebrow",
      tag: "div",
      classes: "text-brand-500 font-heading",
      style: {
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      },
      text: "Starter plan",
    },
    {
      id: "title",
      label: "Title",
      tag: "h2",
      classes: "text-text font-heading",
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
      classes: "text-text",
      style: { margin: 0, opacity: 0.75, lineHeight: 1.6 },
      text: "Fork the repo, edit in-site, publish in one click. No build, no backend.",
    },
    {
      id: "cta",
      label: "Button",
      tag: "button",
      classes: "bg-brand-500 text-bg px-lg py-md rounded-md font-body",
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
};

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

function Node({
  node,
  selectedId,
  onSelect,
}: {
  node: CanvasNode;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const Tag = node.tag as "div";
  const selected = node.id === selectedId;
  return (
    <Tag
      class={node.classes}
      style={{
        ...node.style,
        outline: selected ? "2px solid #3b5bdb" : undefined,
        outlineOffset: "3px",
        cursor: "pointer",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      {node.text}
      {node.children?.map((c) => (
        <Node key={c.id} node={c} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </Tag>
  );
}

function App() {
  const [tree, setTree] = useState(CARD);
  const [selectedId, setSelectedId] = useState("card");
  const selected = find(tree, selectedId) ?? tree;
  const parsed = useMemo(
    () => parseClasses(selected.classes, scales),
    [selected.classes],
  );

  return (
    <div
      style={{
        display: "flex",
        gap: "32px",
        alignItems: "flex-start",
        padding: "40px",
        minHeight: "100vh",
        background: "#eef0f4",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          paddingTop: "24px",
        }}
      >
        <Node node={tree} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <Inspector
        label={selected.label}
        className={selected.classes}
        parsed={parsed}
        scales={scales}
        onChange={(next) => setTree((t) => withClasses(t, selectedId, next))}
      />
    </div>
  );
}

const host = document.getElementById("poc");
if (host) render(<App />, host);

// Start the engine after the theme + first render so its initial scan sees the demo's utilities.
await import("@tailwindcss/browser");
