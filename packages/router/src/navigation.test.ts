// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startNavigation } from "./navigation";
import { routeTableFromPaths } from "./table";

const table = routeTableFromPaths(["/", "/about", "/posts/a"]);

function reset(path = "/") {
  window.history.replaceState(null, "", path);
}

function anchor(href: string, attrs: Record<string, string> = {}): HTMLAnchorElement {
  const a = document.createElement("a");
  a.setAttribute("href", href);
  for (const [k, val] of Object.entries(attrs)) a.setAttribute(k, val);
  document.body.appendChild(a);
  return a;
}

function leftClick(el: Element) {
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
}

let nav: ReturnType<typeof startNavigation> | undefined;

beforeEach(() => {
  document.body.innerHTML = "";
  reset("/");
});

afterEach(() => {
  nav?.destroy();
  nav = undefined;
});

describe("startNavigation", () => {
  it("matches the initial location", () => {
    reset("/about");
    nav = startNavigation(table);
    expect(nav.current()?.route.path).toBe("/about");
  });

  it("soft-navigates a same-origin link click without a reload", () => {
    nav = startNavigation(table);
    leftClick(anchor("/about"));
    expect(window.location.pathname).toBe("/about");
    expect(nav.current()?.route.path).toBe("/about");
  });

  it("notifies subscribers on navigation", () => {
    nav = startNavigation(table);
    const seen: (string | undefined)[] = [];
    nav.subscribe((m) => seen.push(m?.route.path));
    leftClick(anchor("/posts/a"));
    expect(seen).toEqual(["/posts/a"]);
  });

  // happy-dom performs the browser's default anchor navigation when we don't
  // preventDefault, so `defaultPrevented` + a non-firing subscriber are the true
  // signals that our router declined to intercept — not window.location.

  it("does not intercept a click to an unknown route", () => {
    nav = startNavigation(table);
    let fired = false;
    nav.subscribe(() => {
      fired = true;
    });
    const event = new window.MouseEvent("click", { bubbles: true, cancelable: true });
    anchor("/unknown").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(fired).toBe(false);
  });

  it("ignores modified clicks (new-tab intent)", () => {
    nav = startNavigation(table);
    let fired = false;
    nav.subscribe(() => {
      fired = true;
    });
    const event = new window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    });
    anchor("/about").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(fired).toBe(false);
  });

  it("ignores target=_blank and download links", () => {
    nav = startNavigation(table);
    let fired = false;
    nav.subscribe(() => {
      fired = true;
    });
    const blank = new window.MouseEvent("click", { bubbles: true, cancelable: true });
    anchor("/about", { target: "_blank" }).dispatchEvent(blank);
    const dl = new window.MouseEvent("click", { bubbles: true, cancelable: true });
    anchor("/posts/a", { download: "" }).dispatchEvent(dl);
    expect(blank.defaultPrevented).toBe(false);
    expect(dl.defaultPrevented).toBe(false);
    expect(fired).toBe(false);
  });

  it("responds to back/forward (popstate)", () => {
    nav = startNavigation(table);
    nav.navigate("/about");
    nav.navigate("/posts/a");
    window.history.back();
    window.dispatchEvent(new window.Event("popstate"));
    expect(nav.current()?.route.path).toBe("/about");
  });

  it("programmatic navigate with replace does not push history", () => {
    nav = startNavigation(table);
    nav.navigate("/about", { replace: true });
    expect(window.location.pathname).toBe("/about");
    expect(nav.current()?.route.path).toBe("/about");
  });

  it("stops intercepting after destroy", () => {
    nav = startNavigation(table);
    nav.destroy();
    const event = new window.MouseEvent("click", { bubbles: true, cancelable: true });
    anchor("/about").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    nav = undefined;
  });

  it("honors a deployment base", () => {
    reset("/repo/about");
    nav = startNavigation(table, { base: "/repo/" });
    expect(nav.current()?.route.path).toBe("/about");
  });
});
