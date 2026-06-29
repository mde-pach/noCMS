export declare const COLOR_ROLES: readonly ["bg", "surface", "text", "muted", "primary", "on-primary", "border", "accent"];
export type ColorRole = (typeof COLOR_ROLES)[number];
/** Ramps are mode-invariant — never `@mode` qualified. */
export declare const RAMPS: {
    readonly space: readonly ["1", "2", "3", "4", "5", "6"];
    readonly text: readonly ["sm", "base", "lg", "xl", "2xl"];
    readonly radius: readonly ["sm", "md", "lg", "full"];
    readonly shadow: readonly ["sm", "md", "lg"];
};
export type RampName = keyof typeof RAMPS;
export declare const MODES: readonly ["dark"];
export type Mode = (typeof MODES)[number];
export declare function isMode(qualifier: string): qualifier is Mode;
export declare function contractTokenNames(): string[];
export declare function missingContractTokens(tokens: {
    name: string;
}[]): string[];
