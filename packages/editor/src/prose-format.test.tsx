// @vitest-environment happy-dom

import { render } from "preact";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ProseFormat } from "./prose-format.js";

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.innerHTML = "";
});

const blockBtn = (label: string) =>
  container.querySelector<HTMLButtonElement>(`.nc-prose-block[aria-label="${label}"]`);
const markBtn = (label: string) =>
  container.querySelector<HTMLButtonElement>(`.nc-prose-mark[aria-label="${label}"]`);

describe("ProseFormat", () => {
  test("marks the current block kind as active", () => {
    render(
      <ProseFormat kind="h2" onSetBlock={vi.fn()} editing={false} onMark={vi.fn()} />,
      container,
    );
    expect(blockBtn("Heading 2")?.getAttribute("aria-pressed")).toBe("true");
    expect(blockBtn("Paragraph")?.getAttribute("aria-pressed")).toBe("false");
  });

  test("choosing a kind reformats the block", () => {
    const onSetBlock = vi.fn();
    render(
      <ProseFormat
        kind="paragraph"
        onSetBlock={onSetBlock}
        editing={false}
        onMark={vi.fn()}
      />,
      container,
    );
    blockBtn("Heading 1")?.click();
    expect(onSetBlock).toHaveBeenCalledWith("h1");
  });

  test("clicking the active list toggles back to a paragraph", () => {
    const onSetBlock = vi.fn();
    render(
      <ProseFormat
        kind="bulleted"
        onSetBlock={onSetBlock}
        editing={false}
        onMark={vi.fn()}
      />,
      container,
    );
    blockBtn("Bulleted list")?.click();
    expect(onSetBlock).toHaveBeenCalledWith("paragraph");
  });

  test("inline marks are disabled until the text is being edited", () => {
    render(
      <ProseFormat
        kind="paragraph"
        onSetBlock={vi.fn()}
        editing={false}
        onMark={vi.fn()}
      />,
      container,
    );
    expect(markBtn("Bold")?.disabled).toBe(true);
    expect(container.querySelector(".nc-prose-hint")).not.toBeNull();
  });

  test("while editing, an inline mark toggles on the live selection", () => {
    const onMark = vi.fn();
    render(
      <ProseFormat
        kind="paragraph"
        onSetBlock={vi.fn()}
        editing={true}
        onMark={onMark}
      />,
      container,
    );
    const bold = markBtn("Bold");
    expect(bold?.disabled).toBe(false);
    bold?.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
    expect(onMark).toHaveBeenCalledWith("strong");
  });
});
