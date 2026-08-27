import { experimental_AstroContainer } from 'astro/container';
import { createComponent, render, renderComponent, unescapeHTML } from 'astro/runtime/server/index.js';

// Equivalent of what the .astro compiler emits for:  <section><h1>{title}</h1><p>{body}</p></section>
const Hero = createComponent((result, props) => {
  return render`<section class="hero"><h1>${props.title}</h1><p>${props.body}</p></section>`;
});

window.__spike = async () => {
  const container = await experimental_AstroContainer.create();
  const html = await container.renderToString(Hero, {
    props: { title: 'Rendered in the browser', body: 'by astro/container' },
  });
  return html;
};
