import type { Token } from "./types";
/**
 * Nested W3C DTCG generated from the flat tokens, for tooling interop only —
 * one-way by contract (invariant #5): flat source is canonical, this is derived.
 * `@mode` variants (D12) ride along under `$extensions` so the export stays
 * non-lossy without inventing a non-standard top-level shape.
 */
export declare function toDtcg(tokens: Token[]): Record<string, unknown>;
