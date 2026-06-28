import * as v from "valibot";
export declare const LanguageSwitcherSchema: v.ObjectSchema<{
    readonly label: v.OptionalSchema<v.StringSchema<undefined>, "Language">;
}, undefined>;
export type LanguageSwitcherProps = v.InferInput<typeof LanguageSwitcherSchema>;
export declare function LanguageSwitcher({ label }: LanguageSwitcherProps): import("preact").JSX.Element;
