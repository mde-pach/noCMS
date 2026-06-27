import { configDefaults, defineConfig } from "vitest/config";

// The test surface is the monorepo's own packages. `.claude/worktrees/*` are agent
// scratch checkouts that share this repo's tree but not its resolved dependencies, so
// discovering their `*.test.*` would fail on unresolvable imports — exclude them.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/.claude/**", "**/worktrees/**"],
  },
});
