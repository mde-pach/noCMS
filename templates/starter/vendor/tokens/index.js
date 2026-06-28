function X(R){return R.startsWith("--")?R:`--${R.replace(/\./g,"-")}`}function _(R,K){let x=K.map(([U,F])=>`  ${X(U)}: ${F};`).join(`
`);return`${R} {
${x}
}
`}function V(R){let K=_(":root",R.map((F)=>[F.name,F.value])),x=new Map;for(let F of R)for(let[j,z]of Object.entries(F.modes??{})){let H=x.get(j)??[];H.push([F.name,z]),x.set(j,H)}let U=[...x].map(([F,j])=>_(`[data-theme="${F}"]`,j));return[K,...U].join(`
`)}function W(R){switch(R.split(".")[0]){case"color":return"color";case"space":case"text":case"radius":case"size":case"border":return"dimension";case"font":return"fontFamily";default:return}}function $(R){let K={};for(let x of R){let U=x.name.split("."),F=K;for(let O of U.slice(0,-1)){let Q=F[O];if(typeof Q!=="object"||Q===null)F[O]={};F=F[O]}let j=U[U.length-1],z={$value:x.value},H=W(x.name);if(H)z.$type=H;if(x.modes&&Object.keys(x.modes).length>0)z.$extensions={"com.nocms.modes":{...x.modes}};F[j]=z}return K}function L(R){let K=[];for(let x of R){K.push(`${x.name}: ${x.value}`);for(let[U,F]of Object.entries(x.modes??{}))K.push(`${x.name}@${U}: ${F}`);for(let[U,F]of Object.entries(x.breakpoints??{}))K.push(`${x.name}@${U}: ${F}`)}return`${K.join(`
`)}
`}var A=["bg","surface","text","muted","primary","on-primary","border","accent"],B={space:["1","2","3","4","5","6"],text:["sm","base","lg","xl","2xl"],radius:["sm","md","lg","full"],shadow:["sm","md","lg"]},D=["dark"],G=new Set(D);function Z(R){return G.has(R)}function M(){let R=A.map((K)=>`color.${K}`);for(let[K,x]of Object.entries(B))for(let U of x)R.push(`${K}.${U}`);return R}function I(R){let K=new Set(R.map((x)=>x.name));return M().filter((x)=>!K.has(x))}var P=`# Color roles — the named contract components bind to.
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
`;class Y extends Error{line;constructor(R,K){super(`token parse error (line ${K}): ${R}`);this.line=K;this.name="TokenParseError"}}var N=/^([^:@]+?)(?:@([^:]+))?\s*:\s*(.+)$/;function T(R){let K=new Map,x=[];return R.split(/\r?\n/).forEach((U,F)=>{let j=U.trim();if(!j||j.startsWith("#"))return;let z=N.exec(j);if(!z||z[1]===void 0||z[3]===void 0)throw new Y(`expected "name: value", got "${j}"`,F+1);let H=z[1].trim(),O=z[2]?.trim(),Q=z[3].trim();if(!H)throw new Y("empty token name",F+1);let J=K.get(H);if(!J)J={name:H,value:""},K.set(H,J),x.push(H);if(O&&Z(O)){if(!J.modes)J.modes={};J.modes[O]=Q}else if(O){if(!J.breakpoints)J.breakpoints={};J.breakpoints[O]=Q}else J.value=Q}),x.map((U)=>K.get(U))}var C={space:"spacing"};function E(R){return`@theme inline {
${R.map((x)=>{let U=x.name.split("."),F=U[0]??"";return`  --${C[F]??F}-${U.slice(1).join("-")}: var(${X(x.name)});`}).join(`
`)}
}
`}export{E as toTailwindTheme,$ as toDtcg,V as toCssVariables,T as parseTokens,I as missingContractTokens,Z as isMode,L as formatTokens,X as cssVarName,M as contractTokenNames,Y as TokenParseError,B as RAMPS,D as MODES,P as DEFAULT_TOKENS,A as COLOR_ROLES};
