import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const types={'.html':'text/html','.js':'text/javascript'};
const s=http.createServer((q,r)=>{const rel=q.url==='/'?'index.html':decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'');const f=path.join(root,rel);
 if(!fs.existsSync(f)){r.writeHead(404);return r.end('nope');}r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>s.listen(39117,r));
const b=await chromium.launch({executablePath:process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const p=await b.newPage(); await p.goto('http://localhost:39117/'); await p.waitForTimeout(2500);
const browserHtml = await p.evaluate(()=>window.__html||'');
await b.close(); s.close();

const buildHtml = fs.readFileSync(new URL('./real/dist/index.html', import.meta.url),'utf-8');
const section = buildHtml.match(/<section class="mixed">[\s\S]*?<\/section>/)?.[0] ?? '(not found)';

// Normalise volatile bits: island uids, prefixes, and asset hashes.
const norm = (h) => h
  .replace(/uid="[^"]*"/g,'uid="X"').replace(/prefix="[^"]*"/g,'prefix="X"')
  .replace(/component-url="[^"]*"/g,'component-url="U"')
  .replace(/renderer-url="[^"]*"/g,'renderer-url="R"')
  .replace(/before-hydration-url="[^"]*"/g,'before-hydration-url="B"')
  .replace(/<script>[\s\S]*?<\/script>/g,'<script/>')
  .replace(/<style>[\s\S]*?<\/style>/g,'<style/>')
  .replace(/\s+/g,' ').trim();

const a = norm(browserHtml), bb = norm(section);
fs.writeFileSync(new URL('./parity-browser.txt', import.meta.url), a);
fs.writeFileSync(new URL('./parity-build.txt', import.meta.url), bb);
console.log('browser len', a.length, '| build len', bb.length);
console.log(a === bb ? '>>> IDENTICAL after normalisation' : '>>> DIFFERS');
if (a !== bb) {
  for (let i=0;i<Math.max(a.length,bb.length);i++) if(a[i]!==bb[i]) {
    console.log('first divergence at', i);
    console.log(' browser:', JSON.stringify(a.slice(Math.max(0,i-80), i+120)));
    console.log(' build  :', JSON.stringify(bb.slice(Math.max(0,i-80), i+120)));
    break;
  }
}
