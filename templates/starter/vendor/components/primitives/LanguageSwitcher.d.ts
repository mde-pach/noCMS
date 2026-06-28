import * as v from "valibot";
export declare const LanguageSwitcherSchema: v.ObjectSchema<{
    readonly label: v.OptionalSchema<v.StringSchema<undefined>, "Language">;
}, undefined>;
export type LanguageSwitcherProps = v.InferInput<typeof LanguageSwitcherSchema> & {
    class?: string;
    className?: string;
};
export declare function LanguageSwitcher({ label, class: cls, className, }: LanguageSwitcherProps): import("preact").JSX.Element;
