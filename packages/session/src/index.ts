// The editing-session backbone. The deliberate seam @nocms/editor and a starter
// "save & publish" button consume: connect a GitHub client from an auth session,
// open a per-session branch over a repo's content, stage edits, commit, publish.

export { type ConnectOptions, connectGitHub } from "./connect";
export { serializeEntry } from "./serialize";
export {
  type EditingSession,
  type EditingSessionOptions,
  openEditingSession,
} from "./session";
