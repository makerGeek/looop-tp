import { useState } from "react";

export default function App() {
  const [open, setOpen] = useState(false);

  // TODO: compose a Card with a Delete button that opens a confirmation Dialog.

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>Build a Card + Dialog composition here.</p>
    </div>
  );
}
