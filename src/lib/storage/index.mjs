/**
 * Storage adapters. The editor talks only to this interface, so the same editor
 * runs against a developer's working tree and against a GitHub repository.
 *
 *   read(path)            -> string | null
 *   write(files, message) -> void        // files: [{ path, content }]
 *   list(glob)            -> string[]
 *   mode                  -> 'local' | 'github'
 */
export async function createStorage(config) {
  if (config.mode === 'local') return (await import('./local.mjs')).createLocalStorage(config);
  return (await import('./github.mjs')).createGithubStorage(config);
}

/** Local dev is detected, not configured — a dev server is present or it isn't. */
export async function detectMode() {
  try {
    const res = await fetch('/_nocms/fs?probe=1');
    if (res.ok) return 'local';
  } catch { /* no dev server */ }
  return 'github';
}
