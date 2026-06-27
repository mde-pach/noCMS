import type { BlockDef, ComponentManifest, ComponentPack } from "@nocms/components";
import { manifestOf } from "@nocms/components";
import type { ControlDescriptor } from "@nocms/core";
import { type ComponentType, h } from "preact";

/** Crosses postMessage, so every field must be serializable — no schema, no component. */
export interface PluginComponentRegistration {
  /** JSX tag name; must be a valid component name (starts uppercase). */
  name: string;
  /** HTML with `{{key}}` placeholders filled from props (values HTML-escaped). */
  template: string;
  displayName?: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  slots?: string[];
  controls?: ControlDescriptor[];
}

const NAME_RE = /^[A-Z][A-Za-z0-9]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((v): v is string => typeof v === "string");
  return out.length ? out : undefined;
}

/** Keep only well-formed controls; advisory, so drop malformed entries rather than throw. */
function sanitizeControls(value: unknown): ControlDescriptor[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: ControlDescriptor[] = [];
  for (const raw of value) {
    if (
      isRecord(raw) &&
      typeof raw.key === "string" &&
      typeof raw.kind === "string" &&
      typeof raw.label === "string"
    ) {
      const control: ControlDescriptor = {
        key: raw.key,
        kind: raw.kind,
        label: raw.label,
        required: raw.required === true,
      };
      if (raw.default !== undefined) control.default = raw.default;
      if (isRecord(raw.config)) control.config = raw.config;
      out.push(control);
    }
  }
  return out.length ? out : undefined;
}

/**
 * Validate an untrusted registration. Throws on a malformed name or template (the two
 * load-bearing fields); everything else is coerced or dropped. The throw surfaces to the
 * guest as a host-error, never as a host-side crash.
 */
export function validateRegistration(raw: unknown): PluginComponentRegistration {
  if (!isRecord(raw)) throw new Error("registration must be an object");
  if (typeof raw.name !== "string" || !NAME_RE.test(raw.name)) {
    throw new Error("registration.name must be a component name (e.g. MyWidget)");
  }
  if (typeof raw.template !== "string") {
    throw new Error("registration.template must be an HTML string");
  }
  const reg: PluginComponentRegistration = { name: raw.name, template: raw.template };
  const displayName = optionalString(raw.displayName);
  if (displayName) reg.displayName = displayName;
  const description = optionalString(raw.description);
  if (description) reg.description = description;
  const category = optionalString(raw.category);
  if (category) reg.category = category;
  const icon = optionalString(raw.icon);
  if (icon) reg.icon = icon;
  const tags = stringArray(raw.tags);
  if (tags) reg.tags = tags;
  const slots = stringArray(raw.slots);
  if (slots) reg.slots = slots;
  const controls = sanitizeControls(raw.controls);
  if (controls) reg.controls = controls;
  return reg;
}

const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPE[ch] ?? ch);
}

/** Fill `{{key}}` placeholders from props; missing keys become empty, values escaped. */
export function fillTemplate(template: string, props: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = props[key];
    return value === undefined || value === null ? "" : escapeHtml(String(value));
  });
}

/** A host-side component that renders the plugin's template inside an inert sandboxed
 *  iframe — no scripts, opaque origin, no host DOM access. */
function proxyComponent(template: string): ComponentType<Record<string, unknown>> {
  return (props: Record<string, unknown>) =>
    h("iframe", {
      sandbox: "",
      srcdoc: fillTemplate(template, props),
      class: "nocms-plugin-frame",
      style: "display:block;width:100%;border:0;",
      loading: "lazy",
      referrerpolicy: "no-referrer",
    });
}

export function blockFromRegistration(reg: PluginComponentRegistration): BlockDef {
  const def: BlockDef = {
    component: proxyComponent(reg.template),
    category: reg.category ?? "Plugins",
  };
  if (reg.controls) def.controls = reg.controls;
  if (reg.slots) def.slots = reg.slots;
  if (reg.displayName) def.displayName = reg.displayName;
  if (reg.description) def.description = reg.description;
  if (reg.icon) def.icon = reg.icon;
  if (reg.tags) def.tags = reg.tags;
  return def;
}

export interface ComponentRegistrar {
  /** Validates untrusted input; throws on a bad name/template, surfaced to the guest as host-error. */
  registerComponent(raw: unknown): void;
  pack(): ComponentPack;
  manifests(): ComponentManifest[];
  subscribe(listener: () => void): () => void;
}

export interface ComponentRegistrarOptions {
  id?: string;
}

export function createComponentRegistrar(
  options: ComponentRegistrarOptions = {},
): ComponentRegistrar {
  const id = options.id ?? "plugins";
  const blocks: Record<string, BlockDef> = {};
  const listeners = new Set<() => void>();

  return {
    registerComponent(raw) {
      const reg = validateRegistration(raw);
      blocks[reg.name] = blockFromRegistration(reg);
      for (const listener of listeners) listener();
    },
    pack() {
      return { id, trust: "sandboxed", blocks: { ...blocks } };
    },
    manifests() {
      return Object.entries(blocks).map(([name, def]) => manifestOf(name, def));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
