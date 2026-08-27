import { experimental_AstroContainer } from 'astro/container';
import reactRenderer from '@astrojs/react/server.js';
import vueRenderer from '@astrojs/vue/server.js';
import svelteRenderer from '@astrojs/svelte/server.js';
import Mixed from './sections/Mixed.astro';

window.__spike = async (props) => {
  const c = await experimental_AstroContainer.create();
  // ORDER IS LOAD-BEARING: react's check() throws on non-react object components,
  // so the object-based frameworks must claim theirs first.
  c.addServerRenderer({ name: '@astrojs/vue',    renderer: vueRenderer    });
  c.addServerRenderer({ name: '@astrojs/svelte', renderer: svelteRenderer });
  c.addServerRenderer({ name: '@astrojs/react',  renderer: reactRenderer  });
  c.addClientRenderer({ name: '@astrojs/react',  entrypoint: '@astrojs/react/client.js'  });
  c.addClientRenderer({ name: '@astrojs/vue',    entrypoint: '@astrojs/vue/client.js'    });
  c.addClientRenderer({ name: '@astrojs/svelte', entrypoint: '@astrojs/svelte/client.js' });
  const t0 = performance.now();
  const html = await c.renderToString(Mixed, { props });
  window.__renderMs = performance.now() - t0;
  return html;
};
