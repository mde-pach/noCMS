import { parse } from '@astrojs/compiler';
const src = `---
import Hero from '../sections/Hero.astro';
import Columns from '../sections/Columns.astro';
const year = new Date().getFullYear();
---
<Hero title="Hello there" tint="#1C6B5A" />
<Columns count={2}>
  <Hero slot="left" title="Nested" />
  <p slot="right">Copyright {year}</p>
</Columns>`;
const { ast } = await parse(src, { position: true });
const walk = (n, d=0) => {
  const pad='  '.repeat(d);
  if (n.type === 'element' || n.type === 'component')
    console.log(`${pad}<${n.name}> attrs=[${(n.attributes||[]).map(a=>`${a.name}=${a.kind}:${JSON.stringify(a.value).slice(0,22)}`).join(', ')}]`);
  else if (n.type === 'frontmatter') console.log(`${pad}[frontmatter ${n.value.trim().split('\n').length} lines]`);
  (n.children||[]).forEach(c=>walk(c,d+1));
};
walk(ast);
