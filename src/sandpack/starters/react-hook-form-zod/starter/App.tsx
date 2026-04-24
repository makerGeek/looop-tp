import { useState } from "react";

// Toy validator (stand-in for Zod): returns { ok, errors }
function validate(values: { email: string; password: string }) {
  const errors: Record<string, string> = {};
  // TODO: validate email (contains @) and password (>= 8 chars).
  return { ok: Object.keys(errors).length === 0, errors };
}

export default function App() {
  const [values, setValues] = useState({ email: "", password: "" });
  const [submitted, setSubmitted] = useState<null | typeof values>(null);
  const { ok, errors } = validate(values);

  return (
    <form
      style={{ padding: 24, display: "grid", gap: 8, maxWidth: 360, fontFamily: "system-ui" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) setSubmitted(values);
      }}
    >
      <input
        placeholder="email"
        value={values.email}
        onChange={(e) => setValues({ ...values, email: e.target.value })}
      />
      {errors.email ? <small style={{ color: "crimson" }}>{errors.email}</small> : null}
      <input
        type="password"
        placeholder="password"
        value={values.password}
        onChange={(e) => setValues({ ...values, password: e.target.value })}
      />
      {errors.password ? (
        <small style={{ color: "crimson" }}>{errors.password}</small>
      ) : null}
      <button disabled={!ok}>Sign in</button>
      {submitted ? (
        <pre style={{ background: "#f1f5f9", padding: 8 }}>
          {JSON.stringify(submitted, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}
