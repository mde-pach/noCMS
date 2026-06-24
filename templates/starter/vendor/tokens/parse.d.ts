import type { Token } from "./types";
export declare class TokenParseError extends Error {
    readonly line: number;
    constructor(message: string, line: number);
}
export declare function parseTokens(source: string): Token[];
