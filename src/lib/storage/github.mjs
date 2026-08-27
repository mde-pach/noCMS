/** GitHub mode: commit through the REST API. api.github.com is CORS-enabled, so the
 *  browser writes directly — no server of ours anywhere in the path. */
export function createGithubStorage({ token, owner, repo, branch = "main" }) {
  const api = async (path, init = {}) => {
    const res = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
    if (!res.ok) throw new Error(`github ${res.status}: ${await res.text()}`);
    return res.json();
  };

  return {
    mode: "github",
    async read(path) {
      try {
        const r = await api(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
        return new TextDecoder().decode(
          Uint8Array.from(atob(r.content), (c) => c.charCodeAt(0)),
        );
      } catch {
        return null;
      }
    },
    /** The git trees API, because the contents API does not recurse. */
    async list(glob) {
      const prefix = glob.split("*")[0].replace(/\/$/, "");
      const ref = await api(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
      const commit = await api(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`);
      const tree = await api(
        `/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`,
      );
      return tree.tree
        .filter((e) => e.type === "blob" && e.path.startsWith(prefix))
        .map((e) => e.path);
    },
    /** One commit for the whole change set, so a publish is a single revertable step. */
    async write(files, message = "Update site") {
      const ref = await api(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
      const base = await api(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`);
      const blobs = await Promise.all(
        files.map(async (f) => ({
          path: f.path,
          mode: "100644",
          type: "blob",
          sha: (
            await api(`/repos/${owner}/${repo}/git/blobs`, {
              method: "POST",
              body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
            })
          ).sha,
        })),
      );
      const tree = await api(`/repos/${owner}/${repo}/git/trees`, {
        method: "POST",
        body: JSON.stringify({ base_tree: base.tree.sha, tree: blobs }),
      });
      const commit = await api(`/repos/${owner}/${repo}/git/commits`, {
        method: "POST",
        body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
      });
      await api(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha }),
      });
      return { sha: commit.sha };
    },
    describeTarget() {
      return `${owner}/${repo}`;
    },
  };
}
