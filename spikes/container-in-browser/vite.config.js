import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import astro from './astro-vite-plugin.mjs';
import { fileURLToPath } from 'node:url';

function virtualRaw(id, code) {
  const R = '\0' + id;
  return { name: 'raw-'+id, resolveId: (i)=> i===id ? R : null, load: (i)=> i===R ? code : null };
}
function virtualOpts(id, value) {
  const R = '\0' + id;
  return { name: 'opts-'+id, resolveId: (i)=> i===id ? R : null,
           load: (i)=> i===R ? `export default ${JSON.stringify(value)}` : null };
}

export default defineConfig({
  plugins: [
    astro({ root: fileURLToPath(new URL('./', import.meta.url)) }), vue(), svelte(),
    virtualOpts('astro:react:opts', { include:['**/*.jsx','**/*.tsx'], experimentalReactChildren:false, experimentalDisableStreaming:false }),
    virtualOpts('astro:vue:opts', {}),
    virtualOpts('astro:svelte:opts', {}),
    virtualRaw('virtual:astro:vue-app', 'export const setup = () => {};'),
  ],
  define: { 'process.env.NODE_ENV': '"production"' },
  resolve: {
    alias: [
      { find: /^node:async_hooks$/, replacement: new URL('./src/async-hooks-shim.js', import.meta.url).pathname },
      { find: /^react-dom\/server$/, replacement: 'react-dom/server.browser' },
      { find: /^react-dom\/server\.js$/, replacement: 'react-dom/server.browser' },
    ],
  },
  // KEY: an SSR build (so every framework plugin emits SSR codegen, exactly as Astro's
  // server build does) that is fully bundled and therefore runnable in a browser.
  ssr: { noExternal: true, target: 'webworker' },
  build: {
    ssr: 'src/entry-mixed.js',
    outDir: 'dist', emptyOutDir: false, minify: true, target: 'es2022',
    rollupOptions: { output: { entryFileNames: 'astro-spike.js', format: 'es' } },
  },
});
