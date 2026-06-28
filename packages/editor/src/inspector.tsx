// The right rail (inspector): one presenter that shows the props panel for the selected block, a
// short empty state when the selection has no editable props, or the page rail (page settings +
// design tokens + add section) when nothing is selected. Pure view — the shell computes what's
// selected and passes the data + callbacks; the design panel itself is passed in as `brandPanel`
// because the shell owns the live token state.

import type { ControlDescriptor } from "@nocms/core";
import type { VNode } from "preact";
import type { JsxElement } from "./jsx-attributes.js";
import { PropsPanel } from "./props-panel.js";
import { PageRail } from "./rail.js";

export interface InspectorProps {
  /** the selected block with editable controls, or null when none/empty/unselected.
   *  `focus` is the content leaf a click landed on (e.g. `items.2.title`) plus a per-click nonce,
   *  so re-clicking the same leaf re-focuses its field. */
  selected: {
    element: JsxElement;
    name: string;
    controls: ControlDescriptor[];
    focus?: { path: string; nonce: number };
  } | null;
  /** true when a block is selected but exposes no editable props. */
  selectedEmpty: boolean;
  onEdit: () => void;
  onPickImage: (key: string) => void;
  pageName: string;
  title: string;
  description: string;
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
  brandExpanded: boolean;
  onToggleBrand: () => void;
  brandPanel: VNode | null;
  onAddSection: () => void;
}

export function Inspector(props: InspectorProps): VNode {
  if (props.selected) {
    return (
      <PropsPanel
        element={props.selected.element}
        component={props.selected.name}
        meta="SECTION · CORE"
        controls={props.selected.controls}
        focus={props.selected.focus}
        onChange={props.onEdit}
        onPickImage={props.onPickImage}
      />
    );
  }
  if (props.selectedEmpty) {
    return <p class="nocms-empty">No editable properties for this block.</p>;
  }
  return (
    <PageRail
      pageName={props.pageName}
      route="/"
      title={props.title}
      description={props.description}
      onTitle={props.onTitle}
      onDescription={props.onDescription}
      brandExpanded={props.brandExpanded}
      onToggleBrand={props.onToggleBrand}
      brandPanel={props.brandPanel}
      onAddSection={props.onAddSection}
    />
  );
}
