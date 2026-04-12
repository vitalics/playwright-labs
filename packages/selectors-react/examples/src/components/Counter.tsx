import { useState } from "react";

interface CounterProps {
  step?: number;
}

export function Counter({ step = 1 }: CounterProps) {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <button onClick={() => setCount((c) => c - step)}>-</button>
      <span data-testid="count">{count}</span>
      <button onClick={() => setCount((c) => c + step)}>+</button>
    </div>
  );
}
