/** Astro integration: mounts the editor in dev and exposes the local write endpoint. */
export default function nocms() {
  return {
    name: 'nocms',
    hooks: {
      'astro:config:setup': ({ injectRoute, command }) => {
        if (command === 'dev') {
          // Local mode: the dev server is the storage backend, so a developer can run
          // the editor against their working tree while editing files in an IDE.
          injectRoute({ pattern: '/_nocms/fs', entrypoint: './src/lib/fs-endpoint.ts' });
        }
      },
    },
  };
}
