/** Local mode: the Astro dev server is the backend. Writes land in the working tree,
 *  so a developer sees them in their IDE and Vite reloads. No token, no network. */
export function createLocalStorage() {
  const call = async (body) => {
    const res = await fetch("/_nocms/fs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`local storage: ${res.status} ${await res.text()}`);
    return res.json();
  };
  return {
    mode: "local",
    async read(path) {
      return (await call({ op: "read", path })).content;
    },
    async list(glob) {
      return (await call({ op: "list", glob })).paths;
    },
    /** `files` may carry `encoding: "base64"` for binary content such as images. */
    async write(files) {
      await call({ op: "write", files });
      return { local: true };
    },
    describeTarget() {
      return "your working tree";
    },
  };
}
