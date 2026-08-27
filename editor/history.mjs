/**
 * Undo and redo.
 *
 * The page is plain data, so a snapshot stack is enough — no command objects, no
 * inverse operations to keep correct. What matters is COALESCING: a snapshot per
 * keystroke would make Cmd+Z undo one letter at a time, which is worse than useless.
 * Edits to the same field within a short window collapse into one entry.
 */
const COALESCE_MS = 600;
const LIMIT = 100;

export function createHistory({ snapshot, restore }) {
  const past = [];
  const future = [];
  let lastLabel = null;
  let lastAt = 0;
  let suspended = false;

  const notify = () => {
    window.dispatchEvent(
      new CustomEvent("nocms:history", {
        detail: { canUndo: past.length > 0, canRedo: future.length > 0 },
      }),
    );
  };

  return {
    /**
     * Record the state BEFORE a change. `label` identifies the thing being edited, so
     * consecutive edits to the same thing collapse.
     */
    record(label, now = Date.now()) {
      if (suspended) return;
      const coalesce =
        label != null && label === lastLabel && now - lastAt < COALESCE_MS;
      lastLabel = label;
      lastAt = now;
      if (coalesce) return;

      past.push(snapshot());
      if (past.length > LIMIT) past.shift();
      future.length = 0;
      notify();
    },

    async undo() {
      if (!past.length) return false;
      future.push(snapshot());
      suspended = true;
      try {
        await restore(past.pop());
      } finally {
        suspended = false;
      }
      lastLabel = null;
      notify();
      return true;
    },

    async redo() {
      if (!future.length) return false;
      past.push(snapshot());
      suspended = true;
      try {
        await restore(future.pop());
      } finally {
        suspended = false;
      }
      lastLabel = null;
      notify();
      return true;
    },

    /** After a publish, there is nothing to undo back past. */
    clear() {
      past.length = 0;
      future.length = 0;
      lastLabel = null;
      notify();
    },

    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
  };
}
