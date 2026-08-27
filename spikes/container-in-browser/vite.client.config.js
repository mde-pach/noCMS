import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { svelte } from '@sveltejs/vite-plugin-svelte';
function virtualRaw(id, code) {
  const R = '\0' + id;
  return { name: 'raw-'+id, resolveId: (i)=> i===id ? R : null, load: (i)=> i===R ? code : null };
}
export default defineConfig({
  plugins: [vue(), svelte(), virtualRaw('virtual:astro:vue-app', 'export const setup = () => {};')],
  define: { 'process.env.NODE_ENV': '"production"' },
  esbuild: { jsx: 'automatic' },
  build: {
    outDir: 'dist/client', emptyOutDir: true, minify: false, target: 'es2022',
    rollupOptions: {
      input: {
        counter: 'src/Counter.jsx', vuebox: 'src/VueBox.vue', sveltebox: 'src/SvelteBox.svelte',
        'react-client': 'node_modules/@astrojs/react/dist/client.js',
        'vue-client': 'node_modules/@astrojs/vue/dist/client.js',
        'svelte-client': 'node_modules/@astrojs/svelte/dist/client.svelte.js',
        noop: 'src/client/noop.js',
      },
      output: { entryFileNames: '[name].js', chunkFileNames: 'c-[hash].js', format: 'es' },
      preserveEntrySignatures: 'exports-only',
    },
  },
});
