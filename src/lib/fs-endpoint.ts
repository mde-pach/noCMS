/**
 * Local-mode storage backend. DEV ONLY — the integration injects this route only when
 * `astro dev` is running, so it can never exist in a built site.
 */
import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const WRITABLE = ['src/pages', 'src/layouts', 'src/styles', 'src/content', 'public'];

/** Never write outside the project, and never outside the directories the editor owns. */
function resolveSafe(rel: string, forWrite: boolean): string {
  const full = path.resolve(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) throw new Error('path escapes project');
  const relative = path.relative(ROOT, full);
  if (forWrite && !WRITABLE.some((dir) => relative === dir || relative.startsWith(dir + path.sep))) {
    throw new Error(`not writable: ${relative}`);
  }
  return full;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(path.relative(ROOT, full));
  }
  return out;
}

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ mode: 'local', root: path.basename(ROOT) }), {
    headers: { 'content-type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
  try {
    const body = await request.json();
    switch (body.op) {
      case 'read': {
        const file = resolveSafe(body.path, false);
        return json({ content: await fs.readFile(file, 'utf-8').catch(() => null) });
      }
      case 'list': {
        const prefix = String(body.glob).split('*')[0].replace(/\/$/, '');
        const paths = await walk(resolveSafe(prefix, false)).catch(() => []);
        return json({ paths });
      }
      case 'write': {
        for (const f of body.files) {
          const file = resolveSafe(f.path, true);
          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, f.content, 'utf-8');
        }
        return json({ written: body.files.length });
      }
      default:
        return json({ error: `unknown op: ${body.op}` }, 400);
    }
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
};
