import * as v from "valibot";
export declare const LanguageSwitcherSchema: v.ObjectSchema<{
    /** Accessible label for the switcher's nav landmark. */
    readonly label: v.OptionalSchema<v.StringSchema<undefined>, "Language">;
}, undefined>;
export type LanguageSwitcherProps = v.InferInput<typeof LanguageSwitcherSchema>;
export declare function LanguageSwitcher({ label }: LanguageSwitcherProps): import("preact").JSX.Element;
