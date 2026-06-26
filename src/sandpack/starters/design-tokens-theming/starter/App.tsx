import { useEffect, useState } from "react";

// TODO: define theme tokens with CSS custom properties and use them in styles.

export default function App() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => setDark((d) => !d)}>
        {dark ? "light" : "dark"}
      </button>
      <p>Give this page semantic colors that swap with the theme.</p>
    </div>
  );
}
