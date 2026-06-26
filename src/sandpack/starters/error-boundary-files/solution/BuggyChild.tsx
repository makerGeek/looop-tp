import { useState } from "react";

export function BuggyChild() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error("BuggyChild exploded on purpose 💥");
  }

  return (
    <div>
      <p>I'm a happy child component for now.</p>
      <button onClick={() => setShouldThrow(true)}>Throw an error</button>
    </div>
  );
}
