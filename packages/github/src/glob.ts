// `**` spans path segments (including none), `*` and `?` stay within one segment.
// Kept dependency-free so the browser client needs no glob library.

const SPECIAL = /[.+^${}()|[\]\\]/g;

export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        // `**/` collapses to "any leading segments, or none"; a bare `**` is "any chars".
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:.*/)?";
        } else {
          re += ".*";
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += (c ?? "").replace(SPECIAL, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}

export function matchesGlob(path: string, glob: string): boolean {
  return globToRegExp(glob).test(path);
}
