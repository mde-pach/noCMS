import { experimental_AstroContainer } from 'astro/container';
import reactRenderer from '@astrojs/react/server.js';
import Hero from './sections/Hero.astro';

window.__spike = async (props) => {
  const container = await experimental_AstroContainer.create();
  container.addServerRenderer({ name: '@astrojs/react', renderer: reactRenderer });
  container.addClientRenderer({ name: '@astrojs/react', entrypoint: '@astrojs/react/client.js' });
  return await container.renderToString(Hero, { props });
};
