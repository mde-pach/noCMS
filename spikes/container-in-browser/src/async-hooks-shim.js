// Minimal single-threaded AsyncLocalStorage; safe because the browser render is synchronous per call.
export class AsyncLocalStorage {
  #store = undefined;
  run(store, fn, ...args) {
    const prev = this.#store; this.#store = store;
    try { return fn(...args); } finally { this.#store = prev; }
  }
  getStore() { return this.#store; }
  enterWith(store) { this.#store = store; }
  exit(fn, ...args) { return this.run(undefined, fn, ...args); }
}
export default { AsyncLocalStorage };
