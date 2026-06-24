// @vitest-environment happy-dom

import { h } from "preact";
import { useState } from "preact/hooks";
import { renderToString } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { type ComponentMap, hydrateIslands, wrapIslandComponents } from "./index.js";

// A genuinely interactive component: its rendered output is static until hydration wires
// up the click handler that drives `useState`.
function Counter({ start = 0 }: { start?: number }) {
  const [n, setN] = useState(start);
  return h("button", { type: "button", onClick: () => setN(n + 1) }, `count: ${n}`);
}

const registry: ComponentMap = { Counter: Counter as ComponentMap[string] };

// Preact flushes state updates on a microtask, so re-rendered text is read after a tick.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function prerenderInto(container: Element, props: Record<string, unknown>): void {
  const wrapped = wrapIslandComponents(registry, ["Counter"]);
  container.innerHTML = renderToString(h(wrapped.Counter as never, props));
}

describe("hydrateIslands", () => {
  it("attaches interactivity to a prerendered island marker", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    prerenderInto(container, { start: 5 });

    const button = container.querySelector("button");
    if (!button) throw new Error("fixture: no prerendered button");
    expect(button.textContent).toBe("count: 5");

    // Before hydration the markup is inert.
    button.click();
    await tick();
    expect(button.textContent).toBe("count: 5");

    hydrateIslands(registry, container);
    button.click();
    await tick();
    expect(button.textContent).toBe("count: 6");
  });

  it("ignores markers whose component is absent from the registry", () => {
    const container = document.createElement("div");
    container.innerHTML = `<div data-island="Unknown" data-island-props="{}"><span>x</span></div>`;
    expect(() => hydrateIslands(registry, container)).not.toThrow();
    expect(container.querySelector("span")?.textContent).toBe("x");
  });

  it("hydrates every island under the root", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const wrapped = wrapIslandComponents(registry, ["Counter"]);
    container.innerHTML =
      `<section>${renderToString(h(wrapped.Counter as never, { start: 0 }))}</section>` +
      `<section>${renderToString(h(wrapped.Counter as never, { start: 10 }))}</section>`;

    hydrateIslands(registry, container);
    const buttons = container.querySelectorAll("button");
    buttons[0]?.click();
    buttons[1]?.click();
    await tick();
    expect(buttons[0]?.textContent).toBe("count: 1");
    expect(buttons[1]?.textContent).toBe("count: 11");
  });
});
