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
  contentHost: HTMLElement;
  /** top/left of `el` in the surface's coordinate space — for positioning floating chrome. */
  surfaceTop(el: Element): number;
  surfaceLeft(el: Element): number;
  /** outline + label box over a hovered element; `undefined` clears it. */
  showHover(el: Element | undefined, label: string | undefined): void;
  clearHover(): void;
  /** the selected block's name tag, pinned just above its top-left; `undefined` clears it. */
  showSelectionLabel(el: Element | undefined, label: string | undefined): void;
  /** a filled box over the content element a click anchored to (the leaf being edited),
   *  drawn inside the block's selection outline; `undefined` clears it. */
  showContentSelection(el: Element | undefined): void;
  /** a faint tint over the content leaf under the cursor — the hover affordance that signals
   *  "this text is editable"; `undefined` clears it. */
  showContentHover(el: Element | undefined): void;
  /** the drop-indicator line at surface-y `y`; `undefined` clears it. */
  showDropLine(y: number | undefined): void;
  dispose(): void;
}

export function createOverlayLayer(surface: HTMLElement): OverlayLayer {
  const hoverHost = document.createElement("div");
  const labelHost = document.createElement("div");
  const dropHost = document.createElement("div");
  const contentHost = document.createElement("div");
  const contentHoverHost = document.createElement("div");
  surface.append(hoverHost, labelHost, dropHost, contentHost, contentHoverHost);

  const surfaceTop = (el: Element): number =>
    boundingRect(el).top - surface.getBoundingClientRect().top + surface.scrollTop;
  const surfaceLeft = (el: Element): number =>
    boundingRect(el).left - surface.getBoundingClientRect().left + surface.scrollLeft;

  // The name tag both hover and selection show: pinned above the element's top-left, with a small
  // gap (handled in CSS) so it never sits on the border or over the content. They share one tag so
  // the affordance reads the same; a `--hover` modifier only softens the hover one.
  const nameTag = (el: Element, label: string, hover: boolean) => {
    const top = surfaceTop(el);
    const left = surfaceLeft(el);
    const cls = hover ? "nc-name-tag nc-name-tag--hover" : "nc-name-tag";
    return (
      <div class={cls} style={`top:${Math.max(top, 0)}px;left:${left}px`}>
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
  ): void {
    if (!el || !label) {
      render(null, labelHost);
      return;
    }
    render(nameTag(el, label, false), labelHost);
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
    contentHost,
    surfaceTop,
    surfaceLeft,
    showHover,
    clearHover,
    showSelectionLabel,
    showContentSelection,
    showContentHover,
    showDropLine,
    // contentHoverHost stays closure-private; only dispose touches it.
    dispose() {
      render(null, hoverHost);
      render(null, labelHost);
      render(null, dropHost);
      render(null, contentHost);
      render(null, contentHoverHost);
      hoverHost.remove();
      labelHost.remove();
      dropHost.remove();
      contentHost.remove();
      contentHoverHost.remove();
    },
  };
}
