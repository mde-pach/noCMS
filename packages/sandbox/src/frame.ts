// The structural half of the boundary. `frameSandboxPolicy` is pure — it derives
// the iframe sandbox attribute and CSP from the granted capabilities, with
// network denied by default. `createSandboxFrame` is the one DOM edge that
// stamps that policy onto a real element.

import type { Capability } from "@nocms/core";

export interface SandboxPolicy {
  /** iframe `sandbox` token list — never includes `allow-same-origin`. */
  sandbox: string;
  /** CSP for the guest document; `connect-src 'none'` unless network is granted. */
  csp: string;
}

export function frameSandboxPolicy(granted: readonly Capability[]): SandboxPolicy {
  const network = granted.includes("network");
  // allow-scripts but NOT allow-same-origin: the guest runs in a null-origin
  // realm with no access to the host DOM, cookies, or storage.
  const sandbox = "allow-scripts";
  const csp = [
    "default-src 'none'",
    "script-src 'unsafe-inline' blob:",
    "style-src 'unsafe-inline'",
    "img-src data: blob:",
    network ? "connect-src https:" : "connect-src 'none'",
  ].join("; ");
  return { sandbox, csp };
}

export function createSandboxFrame(
  doc: Document,
  policy: SandboxPolicy,
): HTMLIFrameElement {
  const frame = doc.createElement("iframe");
  frame.setAttribute("sandbox", policy.sandbox);
  // The guest document carries the CSP via a meta tag injected at the top of its
  // markup, so network denial holds before any plugin script runs.
  frame.setAttribute("csp", policy.csp);
  frame.style.display = "none";
  return frame;
}

/** Prepend a CSP meta tag to guest HTML so the policy applies to the document itself. */
export function withCspMeta(html: string, csp: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  return /<head[\s>]/i.test(html)
    ? html.replace(/<head([\s>])/i, `<head$1${meta}`)
    : `${meta}${html}`;
}
