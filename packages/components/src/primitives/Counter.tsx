import { useState } from "preact/hooks";
import * as v from "valibot";
import { cx } from "../cx";

export const CounterSchema = v.object({
  label: v.optional(v.string(), "Count"),
  start: v.optional(v.number(), 0),
  step: v.optional(v.number(), 1),
});

export type CounterProps = v.InferInput<typeof CounterSchema> & {
  class?: string;
  className?: string;
};

const STYLE =
  "px-[0.9em] py-[0.4em] rounded-md border border-text bg-transparent text-text [font:inherit] cursor-pointer transition hover:-translate-y-px hover:bg-brand-500/12 focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-[3px]";

// The canonical interactive island: static until hydration wires up the click handler. Its props
// are JSON-serializable, so they survive the prerender marker like any other component's.
export function Counter({
  label = "Count",
  start = 0,
  step = 1,
  class: cls,
  className,
}: CounterProps) {
  const [count, setCount] = useState(start);
  return (
    <button
      type="button"
      class={cx(STYLE, className, cls)}
      onClick={() => setCount(count + step)}
    >
      {label}: {count}
    </button>
  );
}
