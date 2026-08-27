/** The sign-in screen. Both routes are offered as equals: the relay is convenience,
 *  the token is independence, and neither is hidden away as a fallback. */
const CSS = `
  .signin{max-width:460px;margin:12vh auto;padding:0 24px;font:14px/1.6 system-ui,sans-serif}
  .signin h1{font-size:22px;margin:0 0 8px;letter-spacing:-.01em}
  .signin p{color:var(--e-muted);margin:0 0 20px}
  .signin .card{border:1px solid var(--e-line);border-radius:10px;padding:18px;margin-bottom:14px;
                background:var(--e-panel)}
  .signin h2{font-size:14px;margin:0 0 6px;letter-spacing:0;text-transform:none;color:var(--e-ink)}
  .signin small{display:block;color:var(--e-muted);margin-bottom:12px;font-size:12.5px}
  .signin input{width:100%;font:13px ui-monospace,monospace;padding:8px;border:1px solid var(--e-line);
                border-radius:6px;background:var(--e-bg);color:var(--e-ink);margin-bottom:8px}
  .signin .err{color:#b3123c;font-size:13px;margin-top:10px}
  .signin a{color:var(--e-accent)}
`;

export function renderSignIn({ config, onToken, onOAuth, error }) {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const wrap = document.createElement("div");
  wrap.className = "signin";
  wrap.innerHTML = `
    <h1>Edit your site</h1>
    <p>This editor runs on your own site and talks straight to your repository.
       Nothing you type passes through us.</p>
    ${
      config.clientId && config.relayUrl
        ? `<div class="card">
             <h2>Sign in with GitHub</h2>
             <small>Opens GitHub, then comes back here. A small stateless relay does the
               one step a browser cannot do — swapping the sign-in code for a token.</small>
             <button class="primary" id="signin-oauth">Sign in with GitHub</button>
           </div>`
        : ""
    }
    <div class="card">
      <h2>Use a token instead</h2>
      <small>No relay, nothing of ours involved. Create a fine-grained token limited to
        this one repository, with read and write access to its contents.</small>
      <input id="signin-token" type="password" placeholder="github_pat_…"
             autocomplete="off" spellcheck="false" />
      <button id="signin-token-go">Use this token</button>
    </div>
    ${error ? `<p class="err">${error}</p>` : ""}`;

  document.body.append(wrap);
  document.getElementById("signin-oauth")?.addEventListener("click", onOAuth);
  const input = document.getElementById("signin-token");
  const submit = () => input.value.trim() && onToken(input.value.trim());
  document.getElementById("signin-token-go").addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });
}
