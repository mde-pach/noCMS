import * as v from "valibot";
export declare const CounterSchema: v.ObjectSchema<{
    /** text before the count, e.g. "Votes" */
    readonly label: v.OptionalSchema<v.StringSchema<undefined>, "Count">;
    /** count to start from */
    readonly start: v.OptionalSchema<v.NumberSchema<undefined>, 0>;
    /** amount each click adds */
    readonly step: v.OptionalSchema<v.NumberSchema<undefined>, 1>;
}, undefined>;
export type CounterProps = v.InferInput<typeof CounterSchema>;
export declare function Counter({ label, start, step }: CounterProps): import("preact").JSX.Element;
