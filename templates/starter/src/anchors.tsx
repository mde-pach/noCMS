// Interactive proof of the content-anchor mechanism in a real browser, on the real Features
// component. Click any content in the page → the exact prop path is selected and editable.
// The component (Features) is untouched and agnostic: it only ever receives plain strings.
import { Features, FeaturesSchema } from "@nocms/components";
import { enumerateContentPaths } from "@nocms/controls";
import { type ComponentType, h, render } from "preact";
import * as v from "valibot";

// A unique, transform-stable token per leaf (private-use codepoints have no case mapping, so
// `.toUpperCase()` leaves them intact). Inlined so this demo stays self-contained.
const sentinelFor = (index: number): string => `\uE000${index}\uE001`;

// The probe drives the component through the structural `AnyComponent` shape, exactly as the
// registry does — the demo passes a plain props bag, the same agnostic contract the editor uses.
const FeaturesBlock = Features as ComponentType<Record<string, unknown>>;

const stage = document.getElementById("stage") as HTMLElement;
const panel = document.getElementById("panel") as HTMLElement;

const props = v.getDefaults(FeaturesSchema) as Record<string, unknown>;
let selected: string | null = null;

function getPath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((cur, key) => {
    return cur && typeof cur === "object"
      ? (cur as Record<string, unknown>)[key]
      : undefined;
  }, root);
}

function setPath(root: Record<string, unknown>, path: string, value: string): void {
  const keys = path.split(".");
  let cur: Record<string, unknown> = root;
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur[keys[i] as string] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1] as string] = value;
}

/**
 * Browser anchor pass. Render the component with each text leaf replaced by a unique token,
 * then walk text nodes: where a token lands, swap it back to the real value and tag the
 * enclosing element with its path. One render, no content matching — we locate tokens we
 * injected, so two identical strings never collide.
 */
function paint(): void {
  const paths = enumerateContentPaths(FeaturesSchema, props);
  const tokenToLeaf = new Map(
    paths.map((p, i) => [sentinelFor(i), { path: p.path, value: p.value }] as const),
  );

  const probe = structuredClone(props);
  paths.forEach((p, i) => {
    setPath(probe, p.path, sentinelFor(i));
  });

  render(null, stage);
  stage.innerHTML = "";
  render(h(FeaturesBlock, probe), stage);

  const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? "";
    for (const [token, leaf] of tokenToLeaf) {
      if (!text.includes(token)) continue;
      node.nodeValue = text.replace(token, leaf.value);
      const parent = node.parentElement;
      if (parent) {
        parent.dataset.anchorPath = leaf.path;
        if (leaf.path === selected) parent.classList.add("selected");
      }
      break;
    }
  }

  renderPanel(paths.map((p) => p.path));
}

function renderPanel(paths: string[]): void {
  const value = selected ? String(getPath(props, selected) ?? "") : "";
  panel.innerHTML = "";

  const title = document.createElement("h1");
  title.textContent = "Content anchors";
  panel.append(title);

  if (selected) {
    const sel = document.createElement("p");
    sel.innerHTML = `Selected <span class="path">${selected}</span>`;
    const label = document.createElement("label");
    label.textContent = "Edit value — the page updates live";
    const input = document.createElement("textarea");
    input.rows = 3;
    input.value = value;
    input.addEventListener("input", () => {
      setPath(props, selected as string, input.value);
      paint();
      (panel.querySelector("textarea") as HTMLTextAreaElement | null)?.focus();
    });
    panel.append(sel, label, input);
  } else {
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Click any dashed content in the page, or a path below.";
    panel.append(hint);
  }

  const list = document.createElement("ul");
  for (const path of paths) {
    const li = document.createElement("li");
    li.textContent = path;
    if (path === selected) li.className = "active";
    li.addEventListener("click", () => {
      selected = path;
      paint();
    });
    list.append(li);
  }
  panel.append(list);

  const note = document.createElement("p");
  note.className = "hint";
  note.textContent = `${paths.length} text leaves anchored from FeaturesSchema + defaults.`;
  panel.append(note);
}

stage.addEventListener("click", (event) => {
  const el = (event.target as HTMLElement).closest<HTMLElement>("[data-anchor-path]");
  if (!el) return;
  selected = el.dataset.anchorPath ?? null;
  paint();
});

paint();
