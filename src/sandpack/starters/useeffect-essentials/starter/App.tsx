import { useState, useEffect } from "react";

export default function App() {
  const [now, setNow] = useState(new Date());

  // TODO: set an interval that calls setNow every 1000ms.
  // Return a cleanup function that calls clearInterval.

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", fontSize: 48 }}>
      {now.toLocaleTimeString()}
    </div>
  );
}
