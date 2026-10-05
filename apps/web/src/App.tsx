import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase } from './lib/supabase';
import Login from './pages/Login';
import Inbox from './pages/Inbox';
import Contacts from './pages/Contacts';
import Devices from './pages/Devices';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configured)
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="text-xl font-semibold">Setup required</h1>
        <p className="mt-2 text-slate-600">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in{' '}
          <code>apps/web/.env</code> (see <code>.env.example</code>).
        </p>
      </div>
    );
  if (session === undefined) return null;
  if (!session) return <Login />;

  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded px-3 py-1.5 text-sm ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`;

  return (
    <div className="mx-auto flex h-screen max-w-6xl flex-col">
      <header className="flex items-center gap-2 border-b border-slate-200 p-3">
        <span className="mr-4 font-semibold">SMS Gateway</span>
        <NavLink to="/" end className={link}>Inbox</NavLink>
        <NavLink to="/contacts" className={link}>Contacts</NavLink>
        <NavLink to="/devices" className={link}>Devices</NavLink>
        <span className="ml-auto text-sm text-slate-500">{session.user.email}</span>
        <button className="text-sm text-slate-600 underline" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>
      <main className="min-h-0 flex-1">
        <Routes>
          <Route path="/" element={<Inbox />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
