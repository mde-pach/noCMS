// The editor's positioned visual layer: the three affordances drawn *over* the live page in the
// content surface's own coordinate space — the hover outline, the selected block's name tag, and
// the drag drop-indicator line. They are pure presentation: the shell decides what is hovered,
// selected, or being dragged and hands an element (or a y) here to render. Keeping them out of the
// shell isolates "where do the boxes go" from the interaction loop, and gives one place that owns
// the surface-relative geometry (an absolutely-positioned child of the surface measures against
// the surface's border box, adjusted for its scroll).

import { render } from "preact";
import { boundingRect } from "./canvas.js";
import { GripIcon } from "./icons.js";

/** The drop affordance the drag controller hands here to draw: a container to ring and an
 *  insertion line segment (horizontal for a column container, vertical for a row), both already
 *  resolved into the surface's content coordinate space. */
export interface DropIndicator {
  line: {
    orientation: "vertical" | "horizontal";
    x: number;
    y: number;
    length: number;
  };
  container: { left: number; top: number; right: number; bottom: number };
}

export interface OverlayLayer {
  /** the absolutely-positioned hosts; appended to the surface, removed on dispose. */
  hoverHost: HTMLElement;
  labelHost: HTMLElement;
  dropHost: HTMLElement;
  contentHost: HTMLElement;
  /** top/left of `el` in the surface's coordinate space — for positioning floating chrome. */
  surfaceTop(el: Element): number;
  surfaceLeft(el: Element): number;
  /** outline + label box over a hovered element; `undefined` clears it. */
  showHover(el: Element | undefined, label: string | undefined): void;
  clearHover(): void;
  /** the selected block's name tag, pinned just above its top-left; `undefined` clears it. When
   *  `onGrab` is given the tag becomes the drag handle (a grip glyph + a pointer-down that starts
   *  the move). */
  showSelectionLabel(
    el: Element | undefined,
    label: string | undefined,
    onGrab?: (event: PointerEvent) => void,
  ): void;
  /** a filled box over the content element a click anchored to (the leaf being edited),
   *  drawn inside the block's selection outline; `undefined` clears it. */
  showContentSelection(el: Element | undefined): void;
  /** a faint tint over the content leaf under the cursor — the hover affordance that signals
   *  "this text is editable"; `undefined` clears it. */
  showContentHover(el: Element | undefined): void;
  /** the drop affordance — a container ring + an axis-aware insertion line; `undefined` clears it. */
  showDropIndicator(indicator: DropIndicator | undefined): void;
  /** the selection outline over an array item's card (a pricing tier etc.); `undefined` clears it. */
  showItemSelection(el: Element | undefined): void;
  dispose(): void;
}

export function createOverlayLayer(surface: HTMLElement): OverlayLayer {
  const hoverHost = document.createElement("div");
  const labelHost = document.createElement("div");
  const dropHost = document.createElement("div");
  const contentHost = document.createElement("div");
  const contentHoverHost = document.createElement("div");
  const itemHost = document.createElement("div");
  surface.append(
    hoverHost,
    labelHost,
    dropHost,
    contentHost,
    contentHoverHost,
    itemHost,
  );

  const surfaceTop = (el: Element): number =>
    boundingRect(el).top - surface.getBoundingClientRect().top + surface.scrollTop;
  const surfaceLeft = (el: Element): number =>
    boundingRect(el).left - surface.getBoundingClientRect().left + surface.scrollLeft;

  // The name tag both hover and selection show: pinned above the element's top-left, with a small
  // gap (handled in CSS) so it never sits on the border or over the content. They share one tag so
  // the affordance reads the same; a `--hover` modifier only softens the hover one.
  const nameTag = (
    el: Element,
    label: string,
    hover: boolean,
    onGrab?: (event: PointerEvent) => void,
  ) => {
    const rect = boundingRect(el);
    const left = surfaceLeft(el);
    const anchorTop = surfaceTop(el);
    // Flip the tag below its element when there isn't room above it in the viewport — the element is
    // at/under the top, where a tag pinned above would be clipped or sit under the editor's top bar.
    const chromeTop =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--nocms-chrome-top",
        ),
      ) || 0;
    const below = rect.top - chromeTop < 26;
    const top = below ? anchorTop + rect.height : Math.max(anchorTop, 0);
    const cls = [
      "nc-name-tag",
      hover ? "nc-name-tag--hover" : "",
      onGrab ? "nc-name-tag--grab" : "",
      below ? "nc-name-tag--below" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div
        class={cls}
        style={`top:${top}px;left:${left}px`}
        role={onGrab ? "button" : undefined}
        tabIndex={onGrab ? 0 : undefined}
        title={onGrab ? "Drag to move" : undefined}
        onPointerDown={onGrab}
      >
        {onGrab ? <GripIcon size={9} class="nc-name-tag-grip" /> : null}
        {label}
      </div>
    );
  };

  function showHover(el: Element | undefined, label: string | undefined): void {
    if (!el) {
      render(null, hoverHost);
      return;
    }
    const top = surfaceTop(el);
    const left = surfaceLeft(el);
    const rect = boundingRect(el);
    render(
      <>
        <div
          class="nocms-hover"
          style={`top:${top}px;left:${left}px;width:${rect.width}px;height:${rect.height}px`}
        />
        {label ? nameTag(el, label, true) : null}
      </>,
      hoverHost,
    );
  }

  const clearHover = (): void => showHover(undefined, undefined);

  function showSelectionLabel(
    el: Element | undefined,
    label: string | undefined,
    onGrab?: (event: PointerEvent) => void,
  ): void {
    if (!el || !label) {
      render(null, labelHost);
      return;
    }
    render(nameTag(el, label, false, onGrab), labelHost);
  }

  // The content selection box and the lighter hover tint share geometry; only the class differs.
  function contentBox(host: HTMLElement, cls: string, el: Element | undefined): void {
    if (!el) {
      render(null, host);
      return;
    }
    const top = surfaceTop(el);
    const left = surfaceLeft(el);
    const rect = boundingRect(el);
    render(
      <div
        class={cls}
        style={`top:${top}px;left:${left}px;width:${rect.width}px;height:${rect.height}px`}
      />,
      host,
    );
  }

  const showContentSelection = (el: Element | undefined): void =>
    contentBox(contentHost, "nocms-content-sel", el);
  const showContentHover = (el: Element | undefined): void =>
    contentBox(contentHoverHost, "nocms-content-hover", el);

  function showItemSelection(el: Element | undefined): void {
    if (!el) {
      render(null, itemHost);
      return;
    }
    const top = surfaceTop(el);
    const left = surfaceLeft(el);
    const rect = boundingRect(el);
    render(
      <div
        class="nocms-item-sel"
        style={`top:${top}px;left:${left}px;width:${rect.width}px;height:${rect.height}px`}
      />,
      itemHost,
    );
  }

  function showDropIndicator(indicator: DropIndicator | undefined): void {
    if (!indicator) {
      render(null, dropHost);
      return;
    }
    const { line, container } = indicator;
    const lineStyle =
      line.orientation === "horizontal"
        ? `left:${line.x}px;top:${line.y}px;width:${line.length}px;height:2px`
        : `left:${line.x}px;top:${line.y}px;width:2px;height:${line.length}px`;
    render(
      <>
        <div
          class="nocms-drop-zone"
          style={`left:${container.left}px;top:${container.top}px;width:${container.right - container.left}px;height:${container.bottom - container.top}px`}
        />
        <div
          class={`nocms-drop-line${line.orientation === "vertical" ? " nocms-drop-line--v" : ""}`}
          style={lineStyle}
        />
      </>,
      dropHost,
    );
  }

  return {
    hoverHost,
    labelHost,
    dropHost,
    contentHost,
    surfaceTop,
    surfaceLeft,
    showHover,
    clearHover,
    showSelectionLabel,
    showContentSelection,
    showContentHover,
    showDropIndicator,
    showItemSelection,
    // contentHoverHost stays closure-private; only dispose touches it.
    dispose() {
      render(null, hoverHost);
      render(null, labelHost);
      render(null, dropHost);
      render(null, contentHost);
      render(null, contentHoverHost);
      render(null, itemHost);
      hoverHost.remove();
      labelHost.remove();
      dropHost.remove();
      contentHost.remove();
      contentHoverHost.remove();
      itemHost.remove();
    },
  };
}
