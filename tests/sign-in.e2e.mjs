/** GitHub mode from the browser: the sign-in screen, the PAT path, and a real read
 *  through the storage adapter once a session exists. */
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { startDevServer, stopDevServer } from "../scripts/dev-server.mjs";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = 41762;
const results = [];
const check = (n, ok, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${n}${extra ? `  — ${extra}` : ""}`);

await startDevServer(PORT);
const browser = await chromium.launch({ executablePath: CHROME });
try {
  const page = await browser.newPage();
  // Force GitHub mode by making the local probe fail, as it would on a published site.
  await page.route("**/_nocms/fs*", (route) => route.abort());
  await page.addInitScript(() => {
    window.NOCMS_CONFIG = {
      owner: "mde-pach",
      repo: "noCMS",
      branch: "main",
      clientId: "Iv1.test",
      relayUrl: "https://relay.example",
    };
  });
  await page.goto(`http://localhost:${PORT}/edit/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  check("github mode shows sign-in, not the editor", await page.isVisible(".signin"));
  check("offers the GitHub route", await page.isVisible("#signin-oauth"));
  check("offers the token route as an equal", await page.isVisible("#signin-token"));
  const cards = await page.$$eval(".signin .card h2", (e) =>
    e.map((x) => x.textContent),
  );
  check("both routes are presented together", cards.length === 2, cards.join(" | "));

  // PKCE: pressing sign-in must leave for GitHub with a challenge, never a secret.
  const [nav] = await Promise.all([
    page
      .waitForRequest(
        (r) => r.url().startsWith("https://github.com/login/oauth/authorize"),
        { timeout: 8000 },
      )
      .catch(() => null),
    page.click("#signin-oauth"),
  ]);
  if (nav) {
    const u = new URL(nav.url());
    check(
      "authorize url uses PKCE S256",
      u.searchParams.get("code_challenge_method") === "S256",
    );
    check(
      "authorize url carries a challenge",
      (u.searchParams.get("code_challenge") ?? "").length > 20,
    );
    check(
      "authorize url carries state",
      (u.searchParams.get("state") ?? "").length > 10,
    );
    check(
      "no client secret ever leaves the browser",
      !u.searchParams.has("client_secret"),
    );
  } else {
    check("authorize navigation started", false, "no request observed");
  }

  // PAT path: sign in with a real token and read from the real repository.
  const token = execFileSync("gh", ["auth", "token"]).toString().trim();
  const page2 = await browser.newPage();
  await page2.route("**/_nocms/fs*", (route) => route.abort());
  await page2.addInitScript((t) => {
    window.NOCMS_CONFIG = { owner: "mde-pach", repo: "noCMS", branch: "main" };
    localStorage.setItem(
      "nocms:session",
      JSON.stringify({ accessToken: t, expiresAt: Number.MAX_SAFE_INTEGER }),
    );
  }, token);
  await page2.goto(`http://localhost:${PORT}/edit/`, { waitUntil: "networkidle" });
  await page2.waitForTimeout(3000);
  // The target repo may not carry this layout yet. What matters here is that the token
  // authenticated and the adapter reached the repository — an auth failure and a
  // missing-page failure are different things and must not be confused.
  const body = await page2.textContent("body");
  check(
    "a stored token signs in without the relay",
    !(await page2.isVisible(".signin")),
  );
  check(
    "the adapter authenticated against the repository",
    !/401|403|bad credentials/i.test(body),
    body.match(/cannot read \S+/)?.[0] ?? "read succeeded",
  );
  // A repository without this layout is not an error — it is someone who has not set
  // up yet, so they get the teaching path instead of a stack trace.
  const inEditor = await page2.isVisible("#nocms-canvas");
  const onboarding = await page2.isVisible(".ob");
  check(
    "a site that is not set up gets taught, not an error",
    inEditor || onboarding,
    inEditor ? "editor mounted" : "onboarding shown",
  );
  if (onboarding) {
    const headings = await page2.$$eval(".ob h2", (h) => h.map((x) => x.textContent));
    check(
      "it teaches exactly the three unavoidable concepts",
      headings.length === 3,
      headings.join(" · "),
    );
  }
} catch (err) {
  check(err.message.slice(0, 140), false);
} finally {
  console.log(results.join("\n"));
  await browser.close();
  stopDevServer();
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
