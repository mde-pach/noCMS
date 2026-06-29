import { configDefaults, defineConfig } from "vitest/config";

// The test surface is the monorepo's own packages. `.claude/worktrees/*` are agent
// scratch checkouts that share this repo's tree but not its resolved dependencies, so
// discovering their `*.test.*` would fail on unresolvable imports — exclude them.
// `e2e/*.spec.ts` are Playwright smokes (a separate `test:e2e` runner), not vitest.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/.claude/**", "**/worktrees/**", "e2e/**"],
  },
});
