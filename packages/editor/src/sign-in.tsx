import type { VNode } from "preact";
import { GitHubIcon } from "./icons.js";

export interface SignInGateProps {
  siteHost: string;
  onContinue: () => void;
}

export function SignInGate({ siteHost, onContinue }: SignInGateProps): VNode {
  return (
    <div class="nocms-editor nc-signin-root">
      <div class="nc-signin-card">
        <div class="nc-signin-mark">
          no<span>CMS</span>
        </div>
        <div class="nc-signin-title">Sign in to edit this site</div>
        <p class="nc-signin-copy">
          You own <strong>{siteHost}</strong>. Sign in with GitHub to make changes —
          editing is instant, publishing is one click.
        </p>
        <button type="button" class="nc-signin-btn" onClick={onContinue}>
          <GitHubIcon size={17} />
          Continue with GitHub
        </button>
        <div class="nc-signin-foot nc-mono">
          Open source · MIT · You own the repo forever
        </div>
      </div>
    </div>
  );
}
