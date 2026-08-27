import { useState } from 'react';
export default function Counter({ start = 0 }) {
  const [n, setN] = useState(start);
  return <button id="counter" onClick={() => setN(n + 1)}>count: {n}</button>;
}
