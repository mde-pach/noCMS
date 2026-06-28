// @tailwindcss/browser ships a side-effecting global build with no types: importing it starts the
// in-browser JIT engine, which scans the DOM and reads `<style type="text/tailwindcss">` blocks.
declare module "@tailwindcss/browser";
