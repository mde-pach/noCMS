# GitHub App onboarding path for noCMS

Research question: a non-developer signs into a GitHub App in the browser, the app creates a
new website repo for them from a template, and gets it serving on GitHub Pages — all
client-side with the user's (user-to-server) token.

Primary sources: docs.github.com (REST / Apps / Pages reference) plus the GitHub Pages action
repos. Verified June 2026. Where docs are ambiguous, this is called out explicitly.

---

## Verdict-first summary

| # | Question | Answer | Confidence | Citation |
|---|----------|--------|-----------|----------|
| 1 | Create repo from template via GitHub App with a **user token**? | **Yes, with caveat.** `POST /repos/{template_owner}/{template_repo}/generate` works with a user-to-server token. Wrinkle: a template-generated repo is **not auto-added** to the app installation (a blank `POST /user/repos` repo *is*). Creation is authorized at the **account/user level** via the **Administration: write** permission, not by the new repo being pre-installed. | High | [generate endpoint](https://docs.github.com/en/rest/repos/repos#create-a-repository-using-a-template), [permissions table](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens), [community #72593](https://github.com/orgs/community/discussions/72593) |
| 2 | Exact permissions | (a) personal repo create → **Administration: read & write**; (b) Contents → **Contents: read & write**; (c) Pages → **Pages: read & write**; (d) Actions → **Actions: read & write** (read to inspect runs, write to dispatch). | High | [permissions table](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens) |
| 3 | Install + authorize UX | **Two consent moments, collapsible into one flow** via "Request user authorization (OAuth) during installation". Install screen shows requested permissions + repo scope; OAuth screen confirms acting on the user's behalf. Repo creation works immediately after. | High | [generating user token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), [installing from third party](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party) |
| 4 | Pages enablement: API vs ship-a-workflow | **API enable is more robust.** Pushing a `deploy-pages` workflow does **not** auto-enable Pages (the `github-pages` environment must exist first). Use `POST /repos/{owner}/{repo}/pages` with `build_type: "workflow"` once. `configure-pages` with `enablement: true` needs the same `administration:write` + `pages:write` anyway. | High | [configuring publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [create pages site](https://docs.github.com/en/rest/pages/pages#create-a-github-pages-site), [configure-pages action.yml](https://github.com/actions/configure-pages/blob/main/action.yml) |
| 5 | Browser/CORS reality | **Yes.** GitHub REST API returns `Access-Control-Allow-Origin: *`; `/generate`, `/pages`, and Contents are all browser-callable with a user-to-server token. | High | [getting started REST](https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api) |
| 6 | Token lifetimes | **Confirmed unchanged.** User access token **8h**, refresh token **6mo**, refresh is **single-use (rotates)**. Requires expiring tokens enabled on the app. | High | [refreshing tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens) |
| 7 | Rate limits | **Non-issue.** 5,000 req/hr (user token, shared per user). Secondary: ≤80 content-creating req/min, ≤500/hr. Onboarding is a handful of calls. | High | [rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) |
| 8 | Non-dev friction | "All repos vs selected repos" choice at install; org installs may need owner approval; personal account is frictionless. Verified email may be required for some account actions. | Medium | [installing from third party](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party) |

---

## 1. Repo creation from a template via a GitHub App

**Yes — with a user-to-server token, with one wrinkle.**

- Endpoint: `POST /repos/{template_owner}/{template_repo}/generate`. It creates a new repo
  from a template repo and can target the authenticated user's personal account (`owner`
  field in the body). ([generate endpoint](https://docs.github.com/en/rest/repos/repos#create-a-repository-using-a-template))
- **Token type:** It works with a **user-to-server (OAuth web flow / PKCE) token**, not only
  an installation token. GitHub's rule of thumb: unless an endpoint explicitly mandates a PAT
  or Basic Auth, it works with a GitHub App user access token. The request succeeds only if
  **both** the app's granted permissions **and** the acting user's own permissions allow it.
  ([identifying and authorizing users](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/identifying-and-authorizing-users-for-github-apps))
- **The wrinkle (and how creation is authorized):** GitHub Apps normally act on repos where
  they're *installed*, but a brand-new repo doesn't exist at request time. Repo **creation**
  is authorized at the **account/installation level** by the **Administration: read & write**
  permission — an *account*-scoped permission, not a per-repo one. So the app does not need
  the (nonexistent) target repo pre-installed; it needs account-level Administration write on
  the user's account, plus the user's own token.
  ([permissions table](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens))
- **Important downstream wrinkle:** A repo created via **`/generate` is *not* automatically
  added to the installation's repository list**, whereas a blank repo created via
  `POST /user/repos` *is* auto-added. This means that if the app is installed with **"Only
  select repositories"**, follow-up calls (Contents, Pages) against the new repo may be denied
  until the repo is added to the installation. ([community #72593](https://github.com/orgs/community/discussions/72593))
  - Mitigations: (a) install with **"All repositories"** so any new repo is in scope; or
    (b) explicitly add the repo to the installation
    (`PUT /user/installations/{installation_id}/repositories/{repository_id}`, which accepts a
    user access token); or (c) since all calls are made with the **user** token (not an
    installation token), the user's own Administration/Contents/Pages permissions on a repo
    they own are generally sufficient regardless of the installation repo list — but this is
    the **ambiguous** part of the docs and must be verified empirically (see Unknowns).

## 2. Exact GitHub App permissions

As they appear in the GitHub App permission settings UI / the fine-grained permissions
reference ([permissions table](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)):

| Need | Permission setting | Why |
|------|-------------------|-----|
| (a) Create repo in personal account (`/generate`, `/user/repos`) | **Administration: Read and write** | `/generate` and `/user/repos` require Administration write. |
| (b) Read/write repo Contents (commit MDX, tokens, workflow files) | **Contents: Read and write** | `PUT/DELETE /repos/{owner}/{repo}/contents/{path}` and GraphQL `createCommitOnBranch`. |
| (c) GitHub Pages management (enable + read status) | **Pages: Read and write** | `POST /repos/{owner}/{repo}/pages` (create), `PUT .../pages` (update), `GET .../pages` (status). |
| (d) Read/trigger Actions/workflows | **Actions: Read and write** | Read to poll run status; write to `POST .../actions/workflows/{id}/dispatches`. Read-only suffices if publishing is triggered purely by push, not by dispatch. |
| (implied) Repo metadata | **Metadata: Read-only** (mandatory) | GitHub forces this whenever any repo permission is set. |
| (workflow file commits) | **Workflows: Read and write** | Required to create/update files under `.github/workflows/` via the Contents API. The template already shipping the workflow avoids needing this at runtime. |

Note: Administration write is a broad permission (repo delete, collaborators, settings).
Granting it is the price of programmatic repo creation; there is no narrower "create repo"
permission.

## 3. User-facing install + authorize flow

A non-developer's experience ([generating user token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app),
[installing from third party](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party)):

- There are conceptually **two consent moments**: (1) **install** the app on their account —
  choose account + "All repositories" or "Only select repositories", review the requested
  permissions; (2) **authorize (OAuth)** — confirm the app may act on their behalf and receive
  a user access token.
- **Single smooth flow:** Enable **"Request user authorization (OAuth) during installation"**
  in the app settings. Then immediately after install GitHub redirects the user through
  `https://github.com/login/oauth/authorize?client_id=...` to the callback URL with a `code`,
  which is exchanged (via relay) for a user token. To the user it reads as **one continuous
  flow**, ending back on the noCMS site already authorized.
- **Repo creation works immediately** after this flow — the user token + Administration write
  is all that's needed; no waiting period.
- The consent screen shows the app name, the requested permission set (e.g. "Administration:
  read and write", "Contents: read and write", "Pages: read and write"), and the repository
  scope. This is the moment to keep the permission list as small as possible (item 8).

## 4. GitHub Pages enablement — API vs ship-a-workflow

**Recommendation: enable Pages via the API (option a), with `build_type: "workflow"`.**

- **Option (a) — API enable:** `POST /repos/{owner}/{repo}/pages` with body
  `{ "build_type": "workflow" }` sets the source to **GitHub Actions** programmatically and
  creates the `github-pages` environment. Needs **Pages: read & write** (+ Administration to
  create). ([create pages site](https://docs.github.com/en/rest/pages/pages#create-a-github-pages-site))
- **Option (b) — ship the workflow in the template:** Shipping a `.github/workflows/*.yml`
  using `actions/deploy-pages` does **not auto-enable Pages**. The workflow won't run/deploy
  until the **`github-pages` environment exists**, which requires Pages to be enabled with
  the Actions source first. ([configuring publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site))
- The `actions/configure-pages` action offers `enablement: true` to auto-enable Pages from
  inside the workflow — **but its own docs state this requires a token with
  `administration:write` and `pages:write`** (the default `GITHUB_TOKEN` cannot enable Pages).
  ([configure-pages action.yml](https://github.com/actions/configure-pages/blob/main/action.yml))
  So this path needs the *same* permissions plus a custom token in CI — strictly more setup.
- **Conclusion:** A one-time `POST .../pages { build_type: "workflow" }` from the browser is
  the most robust and needs the fewest moving parts: the template ships the
  `deploy-pages` workflow, and the host enables Pages once at onboarding so the first push
  deploys cleanly. ([deploy-pages](https://github.com/actions/deploy-pages))

## 5. Browser / CORS reality

**Yes — all three endpoints are browser-callable.** The GitHub REST API returns
`Access-Control-Allow-Origin: *`, so cross-origin `fetch` from the editor works with a
user-to-server bearer token. `/generate`, `POST /repos/{owner}/{repo}/pages`, and the Contents
endpoints are ordinary REST calls and carry the same CORS support already relied on for
Contents + GraphQL. ([getting started REST](https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api))
The only non-browser step remains the OAuth **code→token exchange** (no CORS on the token
endpoint, client secret required) — that stays in the relay, exactly as today.

## 6. Token lifetimes

**Confirmed, unchanged** ([refreshing tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens)):

- User access token: **8 hours** (28,800 s).
- Refresh token: **6 months** (≈15,897,600 s).
- Refresh is **single-use / rotating**: "Once you use a refresh token, that refresh token and
  the old user access token will no longer work."
- Requires **"Expire user authorization tokens"** to be enabled on the app (it is on by
  default for new apps). If disabled, tokens never expire and no refresh token is issued.

## 7. Rate limits

**Not a concern for onboarding** ([rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)):

- Primary: GitHub App **user** access tokens inherit the authenticated user's **5,000
  requests/hour**, shared across that user's tokens.
- Secondary (content creation): ≤ **80 content-generating req/min**, ≤ **500/hr**. Onboarding
  is ~5–8 calls (generate, enable pages, a few commits, status polls) — orders of magnitude
  under both. Just avoid tight status-poll loops.

## 8. Blockers / friction for a non-developer

- **All vs selected repos at install:** the install screen forces this choice. Recommend
  steering users to **"All repositories"** (or a clear UI nudge), because the `/generate`
  repo is **not** auto-added to a "selected repos" installation (item 1). Selected-repos +
  template generation is the main footgun.
- **Org vs personal:** personal-account installs are frictionless. Installing on an **org**
  the user doesn't own only *requests* approval from an org owner — onboarding can't complete
  until approved. Target **personal accounts** for the happy path.
- **Email verification:** an unverified-email GitHub account can be blocked from some write
  actions; a brand-new signup may hit this. Surface a clear error.
- **Administration: write on the consent screen** may look alarming to a cautious user — keep
  copy reassuring and the permission list minimal.
- Org-level **"app installation restrictions"** can require owner approval even for repo
  admins — another reason to default to personal.

---

## Recommended onboarding flow

Concrete sequence (tokens noted; all REST calls are browser `fetch` unless marked relay):

1. **Install + authorize (one flow).** Send the user to the app's install URL with **"Request
   user authorization (OAuth) during installation"** enabled. They pick their personal account,
   "All repositories", accept permissions, and are redirected to the callback with `?code=...`
   (+ PKCE `code_verifier` held client-side).
2. **Exchange code → token (relay).** Browser posts `code` + `code_verifier` to the **stateless
   relay**, which adds the client secret and calls
   `POST https://github.com/login/oauth/access_token`. Returns **user access token (8h)** +
   **refresh token (6mo)**. Relay holds nothing.
3. **Create the site repo (browser, user token).**
   `POST /repos/{TEMPLATE_OWNER}/{starter-template}/generate`
   body `{ "owner": "<user>", "name": "<sitename>", "private": false }`.
4. **(If "selected repos" was chosen) add repo to installation (browser, user token).**
   `PUT /user/installations/{installation_id}/repositories/{repository_id}`. Skip if "All
   repositories". (See Unknown re: whether user-token calls even need this.)
5. **Enable Pages with Actions source (browser, user token).**
   `POST /repos/{user}/{repo}/pages` body `{ "build_type": "workflow" }`.
6. **First publish.** The template already ships `.github/workflows/publish.yml` using
   `actions/deploy-pages`; the initial commit (or a `workflow_dispatch` via
   `POST .../actions/workflows/{id}/dispatches`) triggers the build → Pages deploy.
7. **Poll status (browser, user token).** `GET /repos/{user}/{repo}/pages` until `status` is
   `built`; show the live URL `https://{user}.github.io/{repo}/`.
8. **Token refresh.** When the 8h token nears expiry, relay-exchange the rotating refresh token
   for a new pair (single-use).

All read/write hits `api.github.com` from the browser; only steps 2 and 8 touch the relay
(code/refresh exchange), preserving the stateless-relay invariant.

---

## What the project owner must set up

A one-time checklist for whoever registers the noCMS launcher GitHub App:

- [ ] **Register a GitHub App** (user-owned is fine for a personal-account-targeted launcher;
      an org-owned app is also installable by anyone if made public).
- [ ] **Make it public** ("Any account can install") so non-developers can install it.
- [ ] **Permissions — set exactly these (and no more):**
  - [ ] Repository → **Administration: Read and write** (repo creation)
  - [ ] Repository → **Contents: Read and write**
  - [ ] Repository → **Pages: Read and write**
  - [ ] Repository → **Actions: Read and write** (or Read-only if publish is push-triggered)
  - [ ] Repository → **Workflows: Read and write** *only if* the host commits workflow files at
        runtime; not needed if the template already ships them
  - [ ] Metadata: Read-only is auto-added — leave it
- [ ] **Enable "Request user authorization (OAuth) during installation"** (collapses install +
      authorize into one flow).
- [ ] **Enable "Expire user authorization tokens"** (gives 8h tokens + 6mo rotating refresh).
- [ ] **Set the Callback / redirect URL** to the noCMS editor/launcher origin that handles the
      `?code=` redirect (must match exactly, including path).
- [ ] **Setup URL (optional):** where the user lands after install if not using the OAuth
      redirect; can point back to the launcher.
- [ ] **Mark the starter repo as a template** (Settings → "Template repository") so `/generate`
      can target it.
- [ ] **Relay/launcher credentials:** the relay needs the App's **Client ID** and **Client
      secret** (for the code→token + refresh exchange only). The browser launcher needs the
      **Client ID** and the install/authorize URL. The relay must never see or store the user
      token beyond the exchange response it returns.
- [ ] **Webhook:** can be left inactive for this flow (no server-side event handling required).

---

## Remaining UNKNOWNS / needs-empirical-verification

1. **Selected-repos + user-token reality.** Docs are ambiguous on whether, with the app
   installed as "selected repositories," a **user access token** can still hit Contents/Pages
   on the freshly `/generate`d repo (which isn't in the installation list) purely on the user's
   own permissions, or whether step 4 (add-to-installation) is mandatory. Test both
   "All repositories" and "selected" installs end-to-end before shipping. Defaulting to "All
   repositories" sidesteps this.
2. **`build_type: "workflow"` on a repo with no prior Pages config.** Confirm the single
   `POST .../pages` call succeeds on a brand-new generated repo (vs. needing a branch/path
   first). Verify the `github-pages` environment is created and the first deploy succeeds.
3. **Whether the human owner prefers a user-owned vs org-owned App** (affects branding,
   ownership continuity, and whether the relay holds org-app credentials). Project-owner
   decision.
4. **Email-verification edge case** for brand-new GitHub signups — confirm the exact failure
   mode and craft user-facing copy.
