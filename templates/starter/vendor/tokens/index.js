function M(R){return R.startsWith("--")?R:`--${R.replace(/\./g,"-")}`}function L(R,A){let x=A.map(([K,F])=>`  ${M(K)}: ${F};`).join(`
`);return`${R} {
${x}
}
`}function Z(R){let A=L(":root",R.map((F)=>[F.name,F.value])),x=new Map;for(let F of R)for(let[V,U]of Object.entries(F.modes??{})){let j=x.get(V)??[];j.push([F.name,U]),x.set(V,j)}let K=[...x].map(([F,V])=>L(`[data-theme="${F}"]`,V));return[A,...K].join(`
`)}function _(R){switch(R.split(".")[0]){case"color":return"color";case"space":case"text":case"radius":case"size":case"border":return"dimension";case"font":return"fontFamily";default:return}}function B(R){let A={};for(let x of R){let K=x.name.split("."),F=A;for(let C of K.slice(0,-1)){let D=F[C];if(typeof D!=="object"||D===null)F[C]={};F=F[C]}let V=K[K.length-1],U={$value:x.value},j=_(x.name);if(j)U.$type=j;if(x.modes&&Object.keys(x.modes).length>0)U.$extensions={"com.nocms.modes":{...x.modes}};F[V]=U}return A}function G(R){let A=[];for(let x of R){A.push(`${x.name}: ${x.value}`);for(let[K,F]of Object.entries(x.modes??{}))A.push(`${x.name}@${K}: ${F}`);for(let[K,F]of Object.entries(x.breakpoints??{}))A.push(`${x.name}@${K}: ${F}`)}return`${A.join(`
`)}
`}var O=["bg","surface","text","muted","primary","on-primary","border","accent"],Q={space:["1","2","3","4","5","6"],text:["sm","base","lg","xl","2xl"],radius:["sm","md","lg","full"],shadow:["sm","md","lg"]},X=["dark"],W=new Set(X);function J(R){return W.has(R)}function Y(){let R=O.map((A)=>`color.${A}`);for(let[A,x]of Object.entries(Q))for(let K of x)R.push(`${A}.${K}`);return R}function $(R){let A=new Set(R.map((x)=>x.name));return Y().filter((x)=>!A.has(x))}var I=`# Color roles — the named contract components bind to.
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
`;class H extends Error{line;constructor(R,A){super(`token parse error (line ${A}): ${R}`);this.line=A;this.name="TokenParseError"}}var S=/^([^:@]+?)(?:@([^:]+))?\s*:\s*(.+)$/;function N(R){let A=new Map,x=[];return R.split(/\r?\n/).forEach((K,F)=>{let V=K.trim();if(!V||V.startsWith("#"))return;let U=S.exec(V);if(!U||U[1]===void 0||U[3]===void 0)throw new H(`expected "name: value", got "${V}"`,F+1);let j=U[1].trim(),C=U[2]?.trim(),D=U[3].trim();if(!j)throw new H("empty token name",F+1);let z=A.get(j);if(!z)z={name:j,value:""},A.set(j,z),x.push(j);if(C&&J(C)){if(!z.modes)z.modes={};z.modes[C]=D}else if(C){if(!z.breakpoints)z.breakpoints={};z.breakpoints[C]=D}else z.value=D}),x.map((K)=>A.get(K))}export{B as toDtcg,Z as toCssVariables,N as parseTokens,$ as missingContractTokens,J as isMode,G as formatTokens,M as cssVarName,Y as contractTokenNames,H as TokenParseError,Q as RAMPS,X as MODES,I as DEFAULT_TOKENS,O as COLOR_ROLES};
