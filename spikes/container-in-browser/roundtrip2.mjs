import { parse } from '@astrojs/compiler';
import fs from 'node:fs';

const file = new URL('./pages/about.astro', import.meta.url);
const src = fs.readFileSync(file, 'utf-8');

/* Lossless tree: every node is modelled. Nodes the editor doesn't understand are
   carried verbatim rather than dropped — otherwise saving destroys the file. */
function toNode(n) {
  if (n.type === 'component' || n.type === 'element') {
    const props = {}, locked = {};
    for (const a of n.attributes || []) (a.kind === 'quoted' ? props : locked)[a.name] = a.value;
    return { kind: 'tag', name: n.name, isSection: n.type === 'component',
             props, locked, selfClosing: !(n.children||[]).length,
             children: (n.children || []).map(toNode) };
  }
  // expression nodes carry their source in children, not `value`
  return { kind: 'raw', type: n.type, value: n.value ?? '',
           children: (n.children || []).map(toNode) };
}
const emit = (n) => {
  if (n.kind === 'raw') {
    if (n.type === 'expression') return '{' + (n.children||[]).map(emit).join('') + '}';
    if (n.type === 'comment') return '<!--' + n.value + '-->';
    return n.value;
  }
  const a = [
    ...Object.entries(n.props).map(([k,v]) => `${k}="${v}"`),
    ...Object.entries(n.locked).map(([k,v]) => `${k}={${v}}`),
  ].join(' ');
  const open = `<${n.name}${a ? ' ' + a : ''}`;
  if (n.selfClosing && !n.children.length) return open + ' />';
  return open + '>' + n.children.map(emit).join('') + `</${n.name}>`;
};

const { ast } = await parse(src, { position: true });
const fm = (ast.children||[]).find(n => n.type === 'frontmatter');
const body = (ast.children||[]).filter(n => n.type !== 'frontmatter').map(toNode);

const serialize = (nodes) => `---${fm.value}---\n` + nodes.map(emit).join('');
const identity = serialize(body);

console.log('IDENTITY ROUND-TRIP (parse -> serialize, no edits)');
console.log('  byte-identical to source :', identity === src);
if (identity !== src) {
  for (let i=0;i<Math.max(identity.length,src.length);i++) if (identity[i]!==src[i]) {
    console.log('  first diff at', i);
    console.log('   original  :', JSON.stringify(src.slice(Math.max(0,i-50), i+70)));
    console.log('   serialized:', JSON.stringify(identity.slice(Math.max(0,i-50), i+70)));
    break;
  }
}
// expression child preserved?
const p = body.find(n => n.kind==='tag' && n.name==='p');
console.log('  <p> children preserved   :', JSON.stringify(p.children.map(c=>c.kind==='raw'?c.type:c.name)));
