function D(f){return f.startsWith("--")?f:`--${f.replace(/\./g,"-")}`}function Q(f,F){let x=F.map(([K,R])=>`  ${D(K)}: ${R};`).join(`
`);return`${f} {
${x}
}
`}function L(f){let F=Q(":root",f.map((R)=>[R.name,R.value])),x=new Map;for(let R of f)for(let[U,z]of Object.entries(R.modes??{})){let A=x.get(U)??[];A.push([R.name,z]),x.set(U,A)}let K=[...x].map(([R,U])=>Q(`[data-theme="${R}"]`,U));return[F,...K].join(`
`)}var M=`# Color roles — the named contract components bind to.
color.bg: #ffffff
color.bg@dark: #0b1120
color.surface: #f8fafc
color.surface@dark: #111827
color.text: #0f172a
color.text@dark: #f1f5f9
color.muted: #64748b
color.muted@dark: #94a3b8
color.primary: #2563eb
color.primary@dark: #60a5fa
color.on-primary: #ffffff
color.on-primary@dark: #0b1120
color.border: #e2e8f0
color.border@dark: #1e293b
color.accent: #7c3aed
color.accent@dark: #a78bfa

# Spacing ramp.
space.1: 0.25rem
space.2: 0.5rem
space.3: 1rem
space.4: 1.5rem
space.5: 2rem
space.6: 3rem

# Type-size ramp.
text.sm: 0.875rem
text.base: 1rem
text.lg: 1.25rem
text.xl: 1.5rem
text.2xl: 2rem

# Radius ramp.
radius.sm: 0.25rem
radius.md: 0.5rem
radius.lg: 1rem
radius.full: 9999px

# Shadow ramp.
shadow.sm: 0 1px 2px rgba(0, 0, 0, 0.06)
shadow.md: 0 4px 12px rgba(0, 0, 0, 0.1)
shadow.lg: 0 12px 32px rgba(0, 0, 0, 0.16)
`;function V(f){switch(f.split(".")[0]){case"color":return"color";case"space":case"text":case"radius":case"size":case"border":return"dimension";case"font":return"fontFamily";default:return}}function W(f){let F={};for(let x of f){let K=x.name.split("."),R=F;for(let _ of K.slice(0,-1)){let j=R[_];if(typeof j!=="object"||j===null)R[_]={};R=R[_]}let U=K[K.length-1],z={$value:x.value},A=V(x.name);if(A)z.$type=A;if(x.modes&&Object.keys(x.modes).length>0)z.$extensions={"com.nocms.modes":{...x.modes}};R[U]=z}return F}function $(f){let F=[];for(let x of f){F.push(`${x.name}: ${x.value}`);for(let[K,R]of Object.entries(x.modes??{}))F.push(`${x.name}@${K}: ${R}`);for(let[K,R]of Object.entries(x.breakpoints??{}))F.push(`${x.name}@${K}: ${R}`)}return`${F.join(`
`)}
`}var X=["bg","surface","text","muted","primary","on-primary","border","accent"],Y={space:["1","2","3","4","5","6"],text:["sm","base","lg","xl","2xl"],radius:["sm","md","lg","full"],shadow:["sm","md","lg"]},Z=["dark"],c=new Set(Z);function J(f){return c.has(f)}function B(){let f=X.map((F)=>`color.${F}`);for(let[F,x]of Object.entries(Y))for(let K of x)f.push(`${F}.${K}`);return f}function G(f){let F=new Set(f.map((x)=>x.name));return B().filter((x)=>!F.has(x))}class H extends Error{line;constructor(f,F){super(`token parse error (line ${F}): ${f}`);this.line=F;this.name="TokenParseError"}}var I=/^([^:@]+?)(?:@([^:]+))?\s*:\s*(.+)$/;function T(f){let F=new Map,x=[];return f.split(/\r?\n/).forEach((K,R)=>{let U=K.trim();if(!U||U.startsWith("#"))return;let z=I.exec(U);if(!z||z[1]===void 0||z[3]===void 0)throw new H(`expected "name: value", got "${U}"`,R+1);let A=z[1].trim(),_=z[2]?.trim(),j=z[3].trim();if(!A)throw new H("empty token name",R+1);let O=F.get(A);if(!O)O={name:A,value:""},F.set(A,O),x.push(A);if(_&&J(_)){if(!O.modes)O.modes={};O.modes[_]=j}else if(_){if(!O.breakpoints)O.breakpoints={};O.breakpoints[_]=j}else O.value=j}),x.map((K)=>F.get(K))}var p={space:"spacing"};function N(f){return`@theme inline {
${f.map((x)=>{let K=x.name.split("."),R=K[0]??"";return`  --${p[R]??R}-${K.slice(1).join("-")}: var(${D(x.name)});`}).join(`
`)}
}
`}export{N as toTailwindTheme,W as toDtcg,L as toCssVariables,T as parseTokens,G as missingContractTokens,J as isMode,$ as formatTokens,D as cssVarName,B as contractTokenNames,H as TokenParseError,Y as RAMPS,Z as MODES,M as DEFAULT_TOKENS,X as COLOR_ROLES};
