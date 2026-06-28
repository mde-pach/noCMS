// A push truncates any redo branch; an identical consecutive snapshot is ignored so a no-op edit
// costs no undo step.

export interface History<T> {
  current(): T;
  push(state: T): void;
  /** Step back; returns the now-current state, or undefined if already at the start. */
  undo(): T | undefined;
  /** Step forward; returns the now-current state, or undefined if already at the tip. */
  redo(): T | undefined;
  canUndo(): boolean;
  canRedo(): boolean;
}

export function createHistory<T>(initial: T): History<T> {
  const stack: T[] = [initial];
  let index = 0;
  const at = (i: number): T => stack[i] as T;
  return {
    current: () => at(index),
    push(state) {
      if (Object.is(state, at(index)) || state === at(index)) return;
      stack.length = index + 1;
      stack.push(state);
      index = stack.length - 1;
    },
    undo() {
      if (index === 0) return undefined;
      index -= 1;
      return at(index);
    },
    redo() {
      if (index >= stack.length - 1) return undefined;
      index += 1;
      return at(index);
    },
    canUndo: () => index > 0,
    canRedo: () => index < stack.length - 1,
  };
}
