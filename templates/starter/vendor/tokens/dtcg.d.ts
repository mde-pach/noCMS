import type { Token } from "./types";
/**
 * Nested W3C DTCG generated from the flat tokens, for tooling interop only — and
 * one-way by contract: the flat source is canonical, this is derived, never read
 * back. `@mode` variants ride along under `$extensions` so the export stays
 * non-lossy without inventing a non-standard top-level shape.
 */
export declare function toDtcg(tokens: Token[]): Record<string, unknown>;
