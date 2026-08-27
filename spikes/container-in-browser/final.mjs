import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const types={'.html':'text/html','.js':'text/javascript'};
const s=http.createServer((q,r)=>{const rel=q.url==='/'?'index.html':decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'');const f=path.join(root,rel);
 if(!fs.existsSync(f)){console.log('  404',rel);r.writeHead(404);return r.end('nope');}
 r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>s.listen(39117,r));
const b=await chromium.launch({executablePath:process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const p=await b.newPage(); const errs=[];
p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:39117/'); await p.waitForTimeout(3000);
console.log('status :', (await p.textContent('#status')).slice(0,300));
console.log('timing :', await p.textContent('#ms'));
const fr = p.frames().find(f=>f!==p.mainFrame());
if(!fr){console.log('NO IFRAME');}
else for (const [name,sel] of [['react','#counter'],['vue','#vuebtn'],['svelte','#sveltebtn']]) {
  try {
    const before = await fr.textContent(sel);
    await fr.click(sel); await p.waitForTimeout(250);
    const after = await fr.textContent(sel);
    console.log(`  ${name.padEnd(7)} ${before.trim().padEnd(12)} -> ${after.trim().padEnd(12)} ${before!==after?'INTERACTIVE ✓':'static only ✗'}`);
  } catch(e){ console.log(`  ${name.padEnd(7)} MISSING (${e.message.split('\n')[0].slice(0,60)})`); }
}
if(errs.length) console.log('ERRORS:\n  '+errs.slice(0,4).join('\n  '));
await b.close(); s.close();
