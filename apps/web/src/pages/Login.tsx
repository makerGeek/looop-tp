import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else if (mode === 'up' && !data.session) setNotice('Check your email to confirm your account.');
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">SMS Gateway</h1>
        <p className="text-sm text-slate-600">Use the same account on the web and in the Android app.</p>
        <input className="w-full rounded border p-2" type="email" required placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded border p-2" type="password" required minLength={6} placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-green-700">{notice}</p>}
        <button disabled={busy} className="w-full rounded bg-slate-900 p-2 text-white disabled:opacity-50">
          {mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="w-full text-sm text-slate-600 underline"
          onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'No account? Sign up' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
