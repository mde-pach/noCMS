import { transform } from '@astrojs/compiler-rs';
import fs from 'node:fs/promises';
import path from 'node:path';

const norm = (p) => p.replace(/\\/g, '/');
/** Mirrors astro/dist/core/compile/compile.js — this drives the scope hash. */
function normalizedFilename(filename, root) {
  const f = norm(filename), r = norm(root);
  return f.startsWith(r) ? f.slice(r.length - 1) : f;
}

const REGISTRY = '/@nocms/css';
const STYLE_RE = /^(?<file>.+\.astro)\?astro&type=style&index=(?<i>\d+)&lang\.css$/;

/**
 * Compiles .astro for the editor using the SAME compiler and options as Astro's build.
 * Get these wrong and styled sections scope differently in the editor than on the site —
 * they render unstyled and nothing tells you why. See spikes/container-in-browser.
 */
export default function astroForEditor({ root, scopedStyleStrategy = 'attribute' }) {
  const cssByFile = new Map();
  return {
    name: 'nocms-astro',
    enforce: 'pre',
    resolveId(id) {
      if (id === REGISTRY) return '\0' + REGISTRY;
      const m = STYLE_RE.exec(id);
      // The resolved id must NOT end in .css or vite's CSS pipeline claims it.
      return m ? `\0nocms-style:${m.groups.file}:${m.groups.i}` : null;
    },
    async load(id) {
      if (id === '\0' + REGISTRY) {
        return `const sheets = new Map();
export function registerCss(file, css) { sheets.set(file, css); }
export function allCss() { return [...sheets.values()].join('\\n'); }`;
      }
      const sm = /^\0nocms-style:(?<file>.+):(?<i>\d+)$/.exec(id);
      if (sm) {
        const css = (cssByFile.get(sm.groups.file) || [])[Number(sm.groups.i)] || '';
        return `import { registerCss } from '${REGISTRY}';\nregisterCss(${JSON.stringify(sm.groups.file)}, ${JSON.stringify(css)});`;
      }
      const [file] = id.split('?');
      if (!file.endsWith('.astro')) return null;
      const source = await fs.readFile(file, 'utf-8');
      const out = transform(source, {
        filename: file,
        normalizedFilename: normalizedFilename(file, root),
        internalURL: 'astro/compiler-runtime',
        scopedStyleStrategy,
        resultScopedSlot: true,
        compact: false,
        resolvePath: (spec) => (spec.startsWith('.') ? path.resolve(path.dirname(file), spec) : spec),
      });
      cssByFile.set(file, out.css || []);
      return { code: out.code, map: null };
    },
  };
}
