import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript'};
const s=http.createServer((q,r)=>{const rel=q.url==='/'?'index.html':decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'');const f=path.join(root,rel);
 if(!fs.existsSync(f)){r.writeHead(404);return r.end('nope');}r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>s.listen(39117,r));
const b=await chromium.launch({executablePath:process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const p=await b.newPage({viewport:{width:1400,height:900}});   // wide editor window
await p.goto('http://localhost:39117/iframe-test2.html'); await p.waitForTimeout(1200);
console.log(await p.textContent('#out'));
await b.close(); s.close();
