import { useState } from "react";

// Stand-in schema mimicking Zod's `.safeParse` — real code would use:
//   const schema = z.object({
//     email: z.string().email(),
//     password: z.string().min(8),
//   });
//   type FormValues = z.infer<typeof schema>;

interface FormValues {
  email: string;
  password: string;
}

function safeParse(values: FormValues) {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
    errors.email = "Enter a valid email.";
  }
  if (values.password.length < 8) {
    errors.password = "Must be at least 8 characters.";
  }
  return Object.keys(errors).length === 0
    ? { success: true as const, data: values }
    : { success: false as const, errors };
}

export default function App() {
  const [values, setValues] = useState<FormValues>({
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState<FormValues | null>(null);
  const result = safeParse(values);

  return (
    <form
      style={{
        padding: 24,
        display: "grid",
        gap: 8,
        maxWidth: 360,
        fontFamily: "system-ui",
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (result.success) setSubmitted(result.data);
      }}
      noValidate
    >
      <label>
        Email
        <input
          type="email"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          onBlur={() => setTouched({ ...touched, email: true })}
        />
      </label>
      {touched.email && !result.success && result.errors.email ? (
        <small style={{ color: "crimson" }}>{result.errors.email}</small>
      ) : null}
      <label>
        Password
        <input
          type="password"
          value={values.password}
          onChange={(e) =>
            setValues({ ...values, password: e.target.value })
          }
          onBlur={() => setTouched({ ...touched, password: true })}
        />
      </label>
      {touched.password && !result.success && result.errors.password ? (
        <small style={{ color: "crimson" }}>{result.errors.password}</small>
      ) : null}
      <button type="submit" disabled={!result.success}>
        Sign in
      </button>
      {submitted ? (
        <pre style={{ background: "#f1f5f9", padding: 8 }}>
          {JSON.stringify(submitted, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}
