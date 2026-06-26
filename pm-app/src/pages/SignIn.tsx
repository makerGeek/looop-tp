import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";

export function SignIn() {
  const { session, loading } = useSession();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (session) {
    const from =
      (location.state as { from?: { pathname: string } } | null)?.from
        ?.pathname ?? "/";
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fn =
      mode === "sign-in"
        ? supabase.auth.signInWithPassword
        : supabase.auth.signUp;
    const { error } = await fn.bind(supabase.auth)({ email, password });
    if (error) setError(error.message);
    setSubmitting(false);
  }

  return (
    <div className="grid h-full place-items-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <h1 className="text-xl font-semibold">
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </h1>
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2"
          />
        </label>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting
            ? "Working…"
            : mode === "sign-in"
              ? "Sign in"
              : "Sign up"}
        </button>
        <button
          type="button"
          className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
          onClick={() =>
            setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"))
          }
        >
          {mode === "sign-in"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
