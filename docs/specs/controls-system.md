# Spec — Controls System (the D9 schema→control mapper)

The technical keystone of D9: how a component's (or collection field's) **valibot schema** is
introspected into the editor controls that drive the props panel and collection entry forms. This
is an architecture spec, not a UX one — the UX of the panel lives in `authoring-shell.md` §4. It
supersedes the TS-parsing `Control`/`discoverControls` (the since-deleted `@nocms/props-discovery`;
invariant #10, rewritten per D9) and unifies with the existing `FieldDef` path. The mapper lives in
`@nocms/controls` (extracted from `@nocms/core` per D26).

> **North star:** one pure function, `deriveControls(schema) → ControlDescriptor[]`, is the single
> source of every control in the product. Components and collections both reach it through valibot,
> so a control can never drift from the type it edits, and a plugin's schema yields a panel with no
> build step.

## 1. The `ControlDescriptor` model

The normalized, renderer-agnostic description the props panel and entry forms consume. It replaces
the current `Control` interface, adding `default`, `advanced`, `showIf`, and richer per-kind config.

```ts
interface ControlDescriptor {
  key: string;                    // the prop / field name
  kind: ControlKind;              // 'text' | 'number' | 'toggle' | 'select' | 'group'
                                  //   | 'list' | 'color' | 'image' | 'url' | 'range'
                                  //   | 'richtext' | 'reference' | 'date' | ...(open, see §3)
  label: string;                  // humanized from key, override via field-config
  required: boolean;
  default?: unknown;              // from the schema's default, when present
  help?: string;
  group?: string;                 // section header in the panel
  advanced?: boolean;             // folded under "More" (§4)
  showIf?: ShowIf;                // conditional visibility (§4)
  config?: ControlConfig;         // kind-specific: select options, range {min,max,step},
                                  //   reference {collection}, list {item: ControlDescriptor}, etc.
  children?: ControlDescriptor[]; // for kind 'group' (nested object)
}
```

`kind` is an **open string set**, not a closed union — the meta-type registry (§3) can add kinds,
so plugins extend it. The base mapper only ever emits the base kinds; everything richer is a
registered meta-type. A descriptor is pure data: serializable, so it crosses the sandbox seam (§7).

## 2. Derivation from a valibot schema

`deriveControls` walks a valibot **object** schema's `.entries` and maps each entry to a descriptor
by unwrapping and inspecting it. The valibot structures read:

- **Wrappers** — `optional` / `nullable` / `nullish` expose `.wrapped` (inner schema) and, for
  `optional`, a possible `.default`. Unwrap to the inner schema; record `required = false` and carry
  the default onto the descriptor.
- **Base types** by `.type`: `string`→`text`, `number`→`number`, `boolean`→`toggle`,
  `picklist`→`select` (config.options from `.options`), `date`→`date`, `object`→`group` (recurse
  into `.entries` → `children`), `array`→`list` (recurse into `.item` → `config.item`).
- **Pipes** — `v.pipe(base, ...actions)` exposes `.pipe = [base, ...actions]`. Read `.pipe[0]` for
  the base type, then scan the actions for: **metadata/brand** (→ meta-type, §3), and **validation
  actions** that refine a control (`minValue`/`maxValue` → `range` config `{min,max}`,
  `minLength`/`maxLength`, `integer` → number step). So `v.pipe(v.number(), v.minValue(0),
  v.maxValue(100), v.metadata({control:'range'}))` derives a `range` control with `{min:0,max:100}`.
- **Unions** — best-effort: a union of literals collapses to a `select`; a heterogeneous union with
  no clear control falls back to `text` and is flagged (an authoring smell worth a lint).

The walk is a pure, recursive function over plain schema structure — no compiler, no TS source, no
runtime `eval`. It runs identically in Node (collections at build/derive) and the browser (live
panel).

## 3. The meta-type registry

Bare types are control-poor (a `string` can't say it's a color). Authors attach a **meta-type** with
`v.metadata({ control })` (or a `v.brand`), and an **open registry** maps each to a control kind +
default config:

```ts
registerControl('color',     { base: 'string', render: TokenSwatch });   // bound to the token palette
registerControl('image',     { base: 'string', render: MediaPicker });
registerControl('url',       { base: 'string', render: UrlField });
registerControl('richtext',  { base: 'string', render: InlineProse });
registerControl('reference', { base: 'string', render: EntryPicker });   // config.collection
registerControl('range',     { base: 'number', render: Slider });
```

- The **base mapper** (§2) emits only base kinds; the registry upgrades a descriptor when its entry
  carries a known `control` meta-type. **Graceful fallback:** an unknown `control` hint logs once and
  renders the base control — never throws, never blanks the panel.
- The registry is **open**: a plugin registers new control kinds at install (capability-scoped, §7).
  The host owns rendering; the registry maps `kind → renderer`, defaulting unknown kinds to base.
- `color` is special: it binds to the token roles (component-library's contract), so colors are
  *token references*, not raw hex — keeping L2 theming coherent.

## 4. `showIf` dependencies and `advanced` folding

Both are expressed **in the schema via metadata**, so they stay single-source with the type:

- `advanced: true` → `v.pipe(v.string(), v.metadata({ advanced: true }))` folds the control under
  "More" in the panel. Required controls are never folded.
- `showIf` → `v.metadata({ showIf: { key: 'hasImage', equals: true } })` hides the control until a
  sibling field matches. The descriptor carries `showIf`; the panel evaluates it against current
  values. Keep the predicate tiny and declarative (`equals` / `in` / `truthy`) — not an expression
  language (that would be a DSL, against invariant #10's spirit).

## 5. Field-config — override-only

The thin escape hatch, extending today's `bridgeFieldConfig`: a per-key overlay that can **relabel,
reorder, regroup, hide, or mark advanced** — but can never *create* a control or change its `kind`.

```ts
type FieldConfig = Record<string, Partial<Pick<
  ControlDescriptor, 'label' | 'help' | 'group' | 'advanced' | 'order' | 'hidden'
>>>;
```

Applied as a pure overlay after derivation. If field-config and schema disagree on existence, the
schema wins (config can hide, not invent). This preserves the no-drift guarantee.

## 6. One mapper, two callers

The mapper lives in `@nocms/controls` (extracted from `core` per D26; both component props and
collection fields need it, but it carries editor introspection that does not belong in the shared
vocabulary). Both callers reach it **through valibot**, so there is one derivation:

- **Component props** declare a valibot schema directly; the prop type is `v.InferOutput`. Call
  `deriveControls(ComponentSchema)`.
- **Collection fields** keep the ergonomic `FieldDef` authoring sugar (the closed `FieldKind` set is
  friendly to hand-author in `nocms.config.json`, D11). `FieldDef` already compiles to valibot via
  `schemaForCollection` → call `deriveControls(schemaForCollection(def))`.

**Recommendation — don't fork; converge at the valibot layer.** Keep `FieldDef` as sugar, but
**enrich `schemaForField` to stamp meta-types** so the rich kinds survive the compile: `kind:'media'`
→ `v.pipe(v.string(), v.metadata({control:'image'}))`, `markdown`→`richtext`, `reference`→
`v.pipe(v.string(), v.metadata({control:'reference', collection}))`, `text`→a multiline `text` hint.
Today `schemaForField` flattens all of these to `v.string()`, losing the control intent; stamping
metadata is the small change that lets the single mapper recover the right control for collections,
exactly as it does for components. `FieldDef` thus becomes a *convenience constructor* over the same
valibot substrate the mapper reads — not a second derivation path.

## 7. Runtime + plugin angle

Because derivation reads plain schema structure, it runs **at runtime in the browser** — including
**inside the sandbox** for plugin components (invariant #8). A plugin ships its valibot props schema
*with* the component; on selection, `deriveControls` runs and the host renders the panel. No build
step, no TS source, no per-plugin control metadata.

Security boundary: **control rendering is host-side**; the `ControlDescriptor[]` is serializable data
that crosses the postMessage seam, and edited **values** cross back — the plugin never touches host
DOM or the token. A plugin registering a *new control kind* (§3) does so capability-scoped
(`components:register`); its renderer runs in the plugin frame, the host composes it — it never gains
host privileges by adding a control.

## Anti-patterns to avoid

1. **Re-introducing hand-declared control metadata** as the *source* (Builder.io `inputs`) — derive
   from the schema; metadata only *annotates*, never *declares*.
2. **A closed `kind` union** — blocks plugin control kinds; keep it open with a registry.
3. **Throwing on unknown meta-types** — always fall back to the base control.
4. **A `showIf` expression language** — keep the predicate declarative and tiny.
5. **Forking collection vs component derivation** — one mapper at the valibot layer; FieldDef is sugar.
6. **Deep-reading valibot internals unguarded** — pin the introspection behind a thin adapter (below).

## Open questions

- **Valibot introspection stability.** The walk depends on `.entries` / `.wrapped` / `.pipe` /
  `.options` shapes. Pin a valibot version and isolate all structural reads behind one small adapter
  module so an upgrade is a one-file change, not a silent breakage. (How stable valibot considers
  these is worth confirming upstream.)
- **Meta-type registry versioning** — how a plugin declares which control kinds/versions it needs,
  and host/plugin compatibility when kinds evolve.
- **`array`-of-`object` ergonomics** — repeatable groups (e.g. pricing tiers) need a good descriptor
  shape and panel affordance; confirm the `list { item: group }` recursion is enough.
- **Default extraction** across all wrapper combinations (`optional(nullable(...))` with defaults).

## Relationship to existing seams

- `@nocms/controls` — **home of `deriveControls`** and the `ControlDescriptor` model, plus the
  content-path walkers (D26). Consumes valibot; depends on nothing else.
- `@nocms/core` — owns `FieldDef`, `schemaForField`, `schemaForCollection` (enriched per §6); the
  vocabulary the schemas are built from.
- `@nocms/editor` — renders descriptors in the props panel (`authoring-shell.md` §4) and the
  collection entry forms (`structure.md`).
- `@nocms/sandbox` — carries plugin schemas + descriptors across the capability seam (§7).
- `@nocms/components` — every component declares its valibot props schema (component-library brick
  rule #1).
