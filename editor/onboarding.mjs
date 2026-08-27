/**
 * Onboarding.
 *
 * §8.5 says the setup crosses concepts the audience has never met, and that making it a
 * teaching moment rather than a wall is a core design problem. Exactly three concepts
 * cannot be hidden, because the owner will see their names elsewhere:
 *
 *   an account · a repository · a published address
 *
 * Everything else — Actions, branches, commits, tokens as a concept — is product
 * language. The owner is never shown a SHA.
 *
 * This runs in the editor on the owner's own site, so the first thing they see already
 * belongs to them. That is the honest demonstration of §3, not a claim about it.
 */
const CSS = `
  .ob{max-width:620px;margin:8vh auto;padding:0 24px;
      font:15px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--e-ink)}
  .ob h1{font-size:26px;margin:0 0 6px;letter-spacing:-.015em}
  .ob .sub{color:var(--e-muted);margin:0 0 28px}
  .ob ol{list-style:none;counter-reset:s;padding:0;margin:0 0 26px}
  .ob li{counter-increment:s;position:relative;padding:0 0 22px 46px;border-left:1px solid var(--e-line);
         margin-left:13px}
  .ob li:last-child{border-left-color:transparent}
  .ob li::before{content:counter(s);position:absolute;left:-14px;top:-2px;width:27px;height:27px;
        display:grid;place-items:center;border-radius:50%;background:var(--e-panel);
        border:1px solid var(--e-line);font:12px ui-monospace,monospace;color:var(--e-muted)}
  .ob li[data-done]::before{content:"✓";background:var(--e-accent);border-color:var(--e-accent);color:#fff}
  .ob h2{font-size:15px;margin:0 0 4px;letter-spacing:0;text-transform:none;color:var(--e-ink)}
  .ob p{margin:0 0 10px;color:var(--e-muted);font-size:14px}
  .ob code{font:12.5px ui-monospace,monospace;background:var(--e-bg);border:1px solid var(--e-line);
           border-radius:4px;padding:1px 5px}
  .ob .aside{font-size:13px;color:var(--e-muted);border-left:2px solid var(--e-line);
             padding-left:12px;margin:0 0 10px}
`;

/**
 * The three concepts, in the order the owner meets them, each explained once in the
 * words they would use rather than the words the tool uses.
 */
export const STEPS = [
  {
    id: "account",
    title: "An account to sign the work",
    plain:
      "GitHub holds your site's files and serves them for free. The account is how it " +
      "knows the site is yours. Nothing is public until you publish.",
    action: "Create a GitHub account",
    href: "https://github.com/signup",
  },
  {
    id: "repository",
    title: "A folder for your site",
    plain:
      "Everything your site is made of lives in one folder, and it is yours. You can " +
      "copy it, move it elsewhere, or hand it to someone else at any time.",
    action: "Make my site's folder",
  },
  {
    id: "address",
    title: "The address people will visit",
    plain:
      "Your site gets a real web address, free and permanent. You can point your own " +
      "domain at it later without moving anything.",
    action: "Turn on my address",
  },
];

/** What is already true, so the owner is never asked to redo a step they finished. */
export function progress({ signedIn, hasRepo, hasAddress }) {
  return {
    account: Boolean(signedIn),
    repository: Boolean(hasRepo),
    address: Boolean(hasAddress),
  };
}

export function nextStep(state) {
  const done = progress(state);
  return STEPS.find((step) => !done[step.id]) ?? null;
}

export function renderOnboarding({ state, onStep }) {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const done = progress(state);
  const wrap = document.createElement("div");
  wrap.className = "ob";
  wrap.innerHTML = `
    <h1>Let's put your site online</h1>
    <p class="sub">Three things, once. After this you just edit and publish.</p>
    <ol>
      ${STEPS.map(
        (step) => `
        <li${done[step.id] ? " data-done" : ""}>
          <h2>${step.title}</h2>
          <p>${step.plain}</p>
          ${
            done[step.id]
              ? ""
              : `<button class="primary" data-step="${step.id}">${step.action}</button>`
          }
        </li>`,
      ).join("")}
    </ol>
    <p class="aside">Your site is plain files you keep. If this tool disappeared tomorrow,
      the site would keep working and stay editable.</p>`;
  document.body.append(wrap);

  for (const button of wrap.querySelectorAll("[data-step]")) {
    button.addEventListener("click", () => {
      const step = STEPS.find((s) => s.id === button.dataset.step);
      if (step.href) window.open(step.href, "_blank", "noopener");
      onStep?.(step.id);
    });
  }
  return wrap;
}
