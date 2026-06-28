/** Join class-name parts, dropping falsy ones — the components' one class-composition helper.
 * The trailing `class`/`className` a component forwards goes last, so an author's utility wins. */
export declare function cx(...parts: (string | false | null | undefined)[]): string;
