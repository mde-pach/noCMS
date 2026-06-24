import { useState } from "preact/hooks";

export interface CounterProps {
  /** text before the count, e.g. "Votes" */
  label?: string;
  /** count to start from */
  start?: number;
  /** amount each click adds */
  step?: number;
}

// The canonical interactive island: static until hydration wires up the click handler that
// drives local state. Its props are plain and JSON-serializable, so they survive the prerender
// marker and props-discovery derives controls for them like any other component.
export function Counter({ label = "Count", start = 0, step = 1 }: CounterProps) {
  const [count, setCount] = useState(start);
  return (
    <button
      type="button"
      class="counter"
      onClick={() => setCount(count + step)}
      style={{
        padding: "0.4em 0.9em",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-text)",
        background: "transparent",
        color: "var(--color-text)",
        font: "inherit",
        cursor: "pointer",
      }}
    >
      {label}: {count}
    </button>
  );
}
