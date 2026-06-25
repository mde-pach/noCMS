// @vitest-environment happy-dom

import { render } from "preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readSiteRuntime } from "../site-runtime";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LatestPosts } from "./LatestPosts";

// The effect mounts, awaits the fetch + json + setState, then preact re-renders — several
// async hops, so settle over a few macrotasks.
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}

function setRuntime(runtime: Record<string, unknown> | null): void {
  document.getElementById("nocms-site")?.remove();
  if (!runtime) return;
  const script = document.createElement("script");
  script.type = "application/json";
  script.id = "nocms-site";
  script.textContent = JSON.stringify(runtime);
  document.head.appendChild(script);
}

function stubFetch(body: unknown, ok = true): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, json: async () => body })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  setRuntime(null);
  document.body.innerHTML = "";
});

describe("readSiteRuntime", () => {
  it("reads the embedded config script", () => {
    setRuntime({ base: "/repo/", feedUrl: "/repo/feed.json" });
    expect(readSiteRuntime()).toEqual({ base: "/repo/", feedUrl: "/repo/feed.json" });
  });

  it("returns null when the script is absent", () => {
    expect(readSiteRuntime()).toBeNull();
  });
});

describe("LanguageSwitcher", () => {
  it("renders the other-locale link and marks the current locale", async () => {
    setRuntime({ base: "/", translationsUrl: "/i18n/translations.json" });
    stubFetch({
      locales: ["en", "fr"],
      groups: [{ translations: { en: "/", fr: "/fr" } }],
    });
    const host = document.body.appendChild(document.createElement("div"));
    render(<LanguageSwitcher />, host);
    await flush();

    const en = host.querySelector('[aria-current="true"]');
    expect(en?.textContent).toBe("en");
    const fr = host.querySelector("a");
    expect(fr?.getAttribute("href")).toBe("/fr");
    expect(fr?.textContent).toBe("fr");
  });

  it("renders nothing without a translations URL", async () => {
    setRuntime({ base: "/" });
    const host = document.body.appendChild(document.createElement("div"));
    render(<LanguageSwitcher />, host);
    await flush();
    expect(host.querySelector("nav")).toBeNull();
  });
});

describe("LatestPosts", () => {
  it("lists the most recent feed items up to the limit", async () => {
    setRuntime({ base: "/", feedUrl: "/feed.json" });
    stubFetch({
      items: [
        {
          url: "/posts/b",
          title: "Second",
          date_published: "2026-02-01T00:00:00.000Z",
        },
        { url: "/posts/a", title: "First", summary: "Hello" },
        { url: "/posts/z", title: "Older" },
      ],
    });
    const host = document.body.appendChild(document.createElement("div"));
    render(<LatestPosts limit={2} />, host);
    await flush();

    const links = host.querySelectorAll("li a");
    expect(links.length).toBe(2);
    expect(links[0]?.textContent).toBe("Second");
    expect(host.querySelector("time")?.getAttribute("dateTime")).toBe(
      "2026-02-01T00:00:00.000Z",
    );
  });

  it("renders nothing without a feed URL", async () => {
    setRuntime({ base: "/" });
    const host = document.body.appendChild(document.createElement("div"));
    render(<LatestPosts />, host);
    await flush();
    expect(host.querySelector("section")).toBeNull();
  });
});
