import reactRenderer from '@astrojs/react/server.js';
import vueRenderer from '@astrojs/vue/server.js';
import svelteRenderer from '@astrojs/svelte/server.js';
import Counter from './Counter.jsx';
import VueBox from './VueBox.vue';
import SvelteBox from './SvelteBox.svelte';

const R = { react: reactRenderer, vue: vueRenderer, svelte: svelteRenderer };
const C = { Counter: [Counter,'../Counter.jsx'], VueBox: [VueBox,'../VueBox.vue'], SvelteBox: [SvelteBox,'../SvelteBox.svelte'] };

window.__debug = async () => {
  const rows = [];
  for (const [cn,[comp,url]] of Object.entries(C)) {
    rows.push(`${cn}: typeof=${typeof comp} keys=${typeof comp==='object'&&comp?Object.keys(comp).slice(0,4).join('|'):'-'}`);
    for (const [rn, r] of Object.entries(R)) {
      let res;
      try { res = await r.check.call({result:{}}, comp, {}, null, {componentUrl:url, displayName:cn}); }
      catch (e) { res = 'THREW: ' + e.message.slice(0,50); }
      rows.push(`   ${rn.padEnd(7)} -> ${res}`);
    }
  }
  return rows.join('\n');
};
