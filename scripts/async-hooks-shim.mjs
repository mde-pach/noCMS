/** Svelte 5's SSR path imports node:async_hooks. The browser render is synchronous
 *  per call, so a single-slot store is sufficient. */
export class AsyncLocalStorage {
  #store;
  run(store, fn, ...args) {
    const prev = this.#store;
    this.#store = store;
    try {
      return fn(...args);
    } finally {
      this.#store = prev;
    }
  }
  getStore() {
    return this.#store;
  }
  enterWith(store) {
    this.#store = store;
  }
  exit(fn, ...args) {
    return this.run(undefined, fn, ...args);
  }
}
export default { AsyncLocalStorage };
