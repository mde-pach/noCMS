# @nocms/github

Browser-callable GitHub client. REST contents + GraphQL createCommitOnBranch for writes, reads for content, branch-per-session lifecycle. All reads/writes run client-side with the owner's token; only the OAuth exchange needs the relay.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
