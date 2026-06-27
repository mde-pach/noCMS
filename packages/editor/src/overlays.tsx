// The editor's positioned visual layer: the three affordances drawn *over* the live page in the
// content surface's own coordinate space — the hover outline, the selected block's name tag, and
// the drag drop-indicator line. They are pure presentation: the shell decides what is hovered,
// selected, or being dragged and hands an element (or a y) here to render. Keeping them out of the
// shell isolates "where do the boxes go" from the interaction loop, and gives one place that owns
// the surface-relative geometry (an absolutely-positioned child of the surface measures against
// the surface's border box, adjusted for its scroll).

import { render } from "preact";
import { boundingRect } from "./canvas.js";

export interface OverlayLayer {
  /** the absolutely-positioned hosts; appended to the surface, removed on dispose. */
  hoverHost: HTMLElement;
  labelHost: HTMLElement;
  dropHost: HTMLElement;
  /** top/left of `el` in the surface's coordinate space — for positioning floating chrome. */
  surfaceTop(el: Element): number;
  surfaceLeft(el: Element): number;
  /** outline + label box over a hovered element; `undefined` clears it. */
  showHover(el: Element | undefined, label: string | undefined): void;
  clearHover(): void;
  /** the selected block's name tag, pinned just above its top-left; `undefined` clears it. */
  showSelectionLabel(el: Element | undefined, label: string | undefined): void;
  /** the drop-indicator line at surface-y `y`; `undefined` clears it. */
  showDropLine(y: number | undefined): void;
  dispose(): void;
}

export function createOverlayLayer(surface: HTMLElement): OverlayLayer {
  const hoverHost = document.createElement("div");
  const labelHost = document.createElement("div");
  const dropHost = document.createElement("div");
  surface.append(hoverHost, labelHost, dropHost);

  const surfaceTop = (el: Element): number =>
    boundingRect(el).top - surface.getBoundingClientRect().top + surface.scrollTop;
  const surfaceLeft = (el: Element): number =>
    boundingRect(el).left - surface.getBoundingClientRect().left + surface.scrollLeft;

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
        {label ? (
          <div class="nc-hover-label" style={`top:${top + 8}px;left:${left + 8}px`}>
            {label}
          </div>
        ) : null}
      </>,
      hoverHost,
    );
  }

  const clearHover = (): void => showHover(undefined, undefined);

  function showSelectionLabel(
    el: Element | undefined,
    label: string | undefined,
  ): void {
    if (!el || !label) {
      render(null, labelHost);
      return;
    }
    const top = surfaceTop(el);
    const left = surfaceLeft(el);
    render(
      <div class="nc-sel-label" style={`top:${Math.max(top, 0)}px;left:${left}px`}>
        {label}
      </div>,
      labelHost,
    );
  }

  function showDropLine(y: number | undefined): void {
    if (y === undefined) {
      render(null, dropHost);
      return;
    }
    render(<div class="nocms-drop-line" style={`top:${y}px`} />, dropHost);
  }

  return {
    hoverHost,
    labelHost,
    dropHost,
    surfaceTop,
    surfaceLeft,
    showHover,
    clearHover,
    showSelectionLabel,
    showDropLine,
    dispose() {
      render(null, hoverHost);
      render(null, labelHost);
      render(null, dropHost);
      hoverHost.remove();
      labelHost.remove();
      dropHost.remove();
    },
  };
}
