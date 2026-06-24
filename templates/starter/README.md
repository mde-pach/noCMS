# noCMS starter

Fork this to your GitHub account to get a noCMS site. Sign in with GitHub and edit it in
place; publishing builds the public site to GitHub Pages via Actions.

```bash
bun install
bun --filter '@nocms/starter' dev     # runtime preview at http://localhost:5173
bun --filter '@nocms/starter' build   # static build to dist/
```

- `content/` — your MDX content.
- `theme.tokens` — the flat, one-token-per-line theme source (edited live in the editor).
- `src/` — the site shell that renders content and hosts the editor.
