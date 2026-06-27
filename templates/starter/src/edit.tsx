// In-site editor, entered *in place* over the live page. It's lazily imported (only on `?edit`),
// so the reader bundle never carries it or the MDX compiler it pulls. It signs the owner in
// (over a scrim, the real page still behind it), then hands the page's content host to
// `mountEditor`, which layers the editing chrome over what is already on screen — no reload, no
// separate route. The editor previews with the same renderer the build prerenders with, and now
// over the same shell and content, so what you edit is what publishes.

import type { ComponentRegistry } from "@nocms/components";
import { EDITOR_CSS, FONTS_HREF, mountEditor, SignInGate } from "@nocms/editor";
import { render } from "preact";

const SIGNED_IN_KEY = "nocms-dev-signed-in";
const EDITOR_CSS_ID = "nocms-editor-css";

// The sign-in gate (and then the editor) need the chrome stylesheet + fonts present before they
// render. mountEditor reuses this same tag (by id), so there is one source for both screens.
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
  /** the page's live content host — the editor takes it over as the editing surface. */
  contentHost: HTMLElement;
  /** MDX source of the page being edited (the same file the reader rendered). */
  mdx: string;
  /** flat token source the design panel themes from. */
  tokens: string;
  /** the site's composed registry MDX tags resolve to. */
  registry: ComponentRegistry;
  /** base path, kept for parity with the reader/build (links, future persistence). */
  base: string;
}

export async function enterEdit(options: EnterEditOptions): Promise<void> {
  ensureChrome();
  if (sessionStorage.getItem(SIGNED_IN_KEY) !== "1") {
    await signIn();
    sessionStorage.setItem(SIGNED_IN_KEY, "1");
  }
  start(options);
}

// The gate is a scrim over the live page (not a screen that replaces it), so the owner signs in
// looking at their actual site. Resolves once they continue. In the real editor `onContinue`
// wires to the PKCE OAuth flow (@nocms/auth).
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
    onChange: (next) => console.info("[nocms] content edited", next.length, "chars"),
    onTokensChange: () => console.info("[nocms] theme edited"),
  });
}
