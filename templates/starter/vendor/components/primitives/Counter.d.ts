export interface CounterProps {
    /** text before the count, e.g. "Votes" */
    label?: string;
    /** count to start from */
    start?: number;
    /** amount each click adds */
    step?: number;
}
export declare function Counter({ label, start, step }: CounterProps): import("preact").JSX.Element;
