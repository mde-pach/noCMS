// The whole fixed chrome as one declarative tree: the top bar, the docked rail, the centred modal,
// and the publish popover, rendered together from a single snapshot of state. The shell paints
// this once per change with `render(<EditorChrome .../>, chromeRoot)` instead of hand-calling a
// separate render function per surface — Preact diffs the lot, so a state change updates exactly
// what changed. The positioned, geometry-tracked affordances (selection toolbar, name tag, hover
// box, drop line) stay imperative in the content surface; those follow the page, not this tree.

import type { VNode } from "preact";
import {
  type Appearance,
  type Breakpoint,
  type BreakpointId,
  type PublishStatus,
  TopBar,
} from "./chrome.js";
import { Inspector, type InspectorProps } from "./inspector.js";
import { Modal, type ModalProps } from "./modals.js";
import { PublishPopover } from "./publish.js";

export interface EditorChromeProps {
  siteHost: string;
  pageName: string;
  breakpoints: Breakpoint[];
  breakpoint: BreakpointId;
  appearance: Appearance;
  dirty: boolean;
  publishStatus: PublishStatus;
  onBreakpoint: (bp: BreakpointId) => void;
  onAppearance: () => void;
  onReset: () => void;
  onTogglePublish: () => void;
  onMenu: () => void;
  inspector: InspectorProps;
  modal: ModalProps;
  publishOpen: boolean;
  publishChanges: { kind: "edit" | "add"; label: string }[];
  onPublishConfirm: () => void;
  onClosePublish: () => void;
}

export function EditorChrome(props: EditorChromeProps): VNode {
  return (
    <>
      <TopBar
        siteHost={props.siteHost}
        pageName={props.pageName}
        breakpoints={props.breakpoints}
        breakpoint={props.breakpoint}
        onBreakpoint={props.onBreakpoint}
        appearance={props.appearance}
        onAppearance={props.onAppearance}
        dirty={props.dirty}
        onReset={props.onReset}
        publishStatus={props.publishStatus}
        onPublish={props.onTogglePublish}
        onMenu={props.onMenu}
        onPagePill={props.onMenu}
        avatarInitial="A"
      />
      <div class="nocms-editor-panel">
        <Inspector {...props.inspector} />
      </div>
      <Modal {...props.modal} />
      {props.publishOpen ? (
        <PublishPopover
          changes={props.publishChanges}
          lastDeploy="2d ago"
          onPublish={props.onPublishConfirm}
          onClose={props.onClosePublish}
        />
      ) : null}
    </>
  );
}
