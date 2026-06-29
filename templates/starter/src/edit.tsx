// Lazily imported (only on `?edit`) so the reader bundle never carries it or the MDX compiler it
// pulls. Signs the owner in over a scrim, then hands the page's live content host to
// `mountEditor` to layer editing chrome over what is already on screen — no reload, no route.

import type { ComponentRegistry } from "@nocms/components";
import {
  EDITOR_CSS,
  FONTS_HREF,
  mountEditor,
  SignInGate,
  type StyleSectionContext,
} from "@nocms/editor";
import { VIEWPORTS } from "@nocms/style-controls";
import { render } from "preact";
import { StylePanel } from "./poc/style-panel";
import { ensureTailwindPreview } from "./tailwind-preview";

// The site owns its styling system (invariant #2): the editor exposes the selected element's
// `class`; this panel — the Tailwind catalog's capability controls, scoped to the mode bar's
// viewport×state variant — generates utility classes onto it. Editing `class` re-renders the
// component (which forwards `className`), and the in-page Tailwind engine compiles the result live.
function StyleSection({ tag, viewport, getClass, setClass }: StyleSectionContext) {
  return (
    <StylePanel tag={tag} viewport={viewport} getClass={getClass} setClass={setClass} />
  );
}

// The top-bar viewport switcher *is* the styling breakpoint (canvas width and the variant the Style
// panel authors are one choice). The site supplies the Tailwind viewports so the editor stays
// styling-agnostic; the panel maps the active id back to a `sm:`/`md:` prefix.
const BREAKPOINTS = VIEWPORTS.map((v) => ({
  id: v.key,
  label: v.label,
  width: `${v.width}px`,
}));

const SIGNED_IN_KEY = "nocms-dev-signed-in";
const EDITOR_CSS_ID = "nocms-editor-css";

// mountEditor reuses this same tag by id, so the gate and the editor share one source for the
// chrome stylesheet + fonts.
function ensureChrome(): void {
  if (!document.getElementById(EDITOR_CSS_ID)) {
    const style = document.createElement("style");
    style.id = EDITOR_CSS_ID;
    style.textContent = EDITOR_CSS;
    document.head.appendChild(style);
  }
  if (!document.querySelector("link[data-nocms-fonts]")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    link.setAttribute("data-nocms-fonts", "");
    document.head.appendChild(link);
  }
}

export interface EnterEditOptions {
  contentHost: HTMLElement;
  mdx: string;
  tokens: string;
  registry: ComponentRegistry;
  // Unused for now; kept for parity with the reader/build (links, future persistence).
  base: string;
}

export async function enterEdit(options: EnterEditOptions): Promise<void> {
  ensureChrome();
  void ensureTailwindPreview(options.tokens);
  if (sessionStorage.getItem(SIGNED_IN_KEY) !== "1") {
    await signIn();
    sessionStorage.setItem(SIGNED_IN_KEY, "1");
  }
  start(options);
}

// A dev placeholder for the real sign-in: `onContinue` stands in for the PKCE OAuth flow
// (@nocms/auth). A scrim, not a replacement screen, so the owner signs in looking at their site.
function signIn(): Promise<void> {
  return new Promise((resolve) => {
    const gate = document.createElement("div");
    document.body.append(gate);
    render(
      <SignInGate
        siteHost="nocms.github.io"
        onContinue={() => {
          render(null, gate);
          gate.remove();
          resolve();
        }}
      />,
      gate,
    );
  });
}

function start({ contentHost, mdx, tokens, registry }: EnterEditOptions): void {
  // Unmount the reader's Preact root (dev) and clear any prerendered static HTML (published) so
  // the editor owns a clean slot in either entry path.
  render(null, contentHost);
  contentHost.replaceChildren();
  void mountEditor({
    target: contentHost,
    mdx,
    components: registry,
    tokens,
    breakpoints: BREAKPOINTS,
    onChange: (next) => console.info("[nocms] content edited", next.length, "chars"),
    onTokensChange: () => console.info("[nocms] theme edited"),
    renderStyleSection: (ctx) => <StyleSection {...ctx} />,
  });
}
