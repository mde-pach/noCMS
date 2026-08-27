import { experimental_AstroContainer } from 'astro/container';
import r from '@astrojs/svelte/server.js';
import Solo from './sections/Solo.astro';
window.__spike = async () => {
  const c = await experimental_AstroContainer.create();
  c.addServerRenderer({ name: '@astrojs/svelte', renderer: r });
  c.addClientRenderer({ name: '@astrojs/svelte', entrypoint: '@astrojs/svelte/client.js' });
  return await c.renderToString(Solo, { props: {} });
};
