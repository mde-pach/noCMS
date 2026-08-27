import { transform } from '@astrojs/compiler-rs';
import fs from 'node:fs/promises';
import path from 'node:path';

const norm = p => p.replace(/\\/g, '/');
// Mirrors astro/dist/core/compile/compile.js normalizeFilename()
function normalizedFilename(filename, root) {
  const f = norm(filename), r = norm(root);
  return f.startsWith(r) ? f.slice(r.length - 1) : f;
}

const REGISTRY = '/@nocms/css-registry';
const STYLE_RE = /^(?<file>.+\.astro)\?astro&type=style&index=(?<i>\d+)&lang\.css$/;

/**
 * Compiles .astro for the editor bundle using the SAME compiler and the SAME options
 * Astro's own build uses, so scope hashes and markup match byte-for-byte.
 * Collected CSS is exposed via a registry the editor injects into the iframe.
 */
export default function astroPlugin({ root, scopedStyleStrategy = 'attribute', compressHTML = false } = {}) {
  const cssByFile = new Map();
  return {
    name: 'nocms-astro',
    enforce: 'pre',
    resolveId(id) {
      if (id === REGISTRY) return '\0' + REGISTRY;
      const m = STYLE_RE.exec(id);
      // NB: the resolved id must NOT end in .css, or vite's CSS pipeline claims it
      // and lightningcss tries to parse our JS module as a stylesheet.
      return m ? `\0nocms-style:${m.groups.file}:${m.groups.i}` : null;
    },
    load(id) {
      if (id.startsWith('\0')) {
        if (id === '\0' + REGISTRY) {
          return `const sheets = new Map();
export function registerCss(file, css){ sheets.set(file, css); }
export function allCss(){ return [...sheets.values()].join('\\n'); }`;
        }
        const sm = /^\0nocms-style:(?<file>.+):(?<i>\d+)$/.exec(id);
        if (!sm) return null;
        const css = (cssByFile.get(sm.groups.file) || [])[Number(sm.groups.i)] || '';
        // Register rather than emit a stylesheet: the editor needs the text to inject
        // into the iframe document, which is a different document from the editor's.
        return `import { registerCss } from '${REGISTRY}';
registerCss(${JSON.stringify(sm.groups.file)}, ${JSON.stringify(css)});`;
      }
      if (id === '\0' + REGISTRY) {
        return `const sheets = new Map();
export function registerCss(file, css){ sheets.set(file, css); }
export function allCss(){ return [...sheets.values()].join('\\n'); }`;
      }
      const [file] = id.split('?');
      if (!file.endsWith('.astro')) return null;
      return fs.readFile(file, 'utf-8').then(source => {
        const out = transform(source, {
          compact: compressHTML,
          filename: file,
          normalizedFilename: normalizedFilename(file, root),
          internalURL: 'astro/compiler-runtime',
          scopedStyleStrategy,
          resultScopedSlot: true,
          resolvePath: (spec) => spec.startsWith('.') ? path.resolve(path.dirname(file), spec) : spec,
        });
        cssByFile.set(file, out.css || []);
        return { code: out.code, map: null };
      });
    },
  };
}
