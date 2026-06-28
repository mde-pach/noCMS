import * as v from "valibot";
export declare const CounterSchema: v.ObjectSchema<{
    readonly label: v.OptionalSchema<v.StringSchema<undefined>, "Count">;
    readonly start: v.OptionalSchema<v.NumberSchema<undefined>, 0>;
    readonly step: v.OptionalSchema<v.NumberSchema<undefined>, 1>;
}, undefined>;
export type CounterProps = v.InferInput<typeof CounterSchema> & {
    class?: string;
    className?: string;
};
export declare function Counter({ label, start, step, class: cls, className, }: CounterProps): import("preact").JSX.Element;
