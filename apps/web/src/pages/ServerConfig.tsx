import { FormEvent, useState } from 'react';
import { getConfig, saveConfig } from '../lib/supabase';

export default function ServerConfig({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const existing = getConfig();
  const [url, setUrl] = useState(existing?.url ?? '');
  const [key, setKey] = useState(existing?.key ?? '');
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^https?:\/\//.test(url.trim())) return setError('Enter the project URL, e.g. https://xxxx.supabase.co');
    saveConfig(url, key);
    onDone();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Connect to your server</h1>
        <p className="text-sm text-slate-600">
          Your Supabase project URL and anon (public) key, from Project Settings → API. They stay in this browser.
        </p>
        <input id="server-url" className="w-full rounded border p-2" required placeholder="https://xxxx.supabase.co"
          value={url} onChange={(e) => setUrl(e.target.value)} />
        <input id="server-key" className="w-full rounded border p-2" required placeholder="Anon key"
          value={key} onChange={(e) => setKey(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-slate-900 p-2 text-white">Save</button>
        {onCancel && (
          <button type="button" className="w-full text-sm text-slate-600 underline" onClick={onCancel}>Cancel</button>
        )}
      </form>
    </div>
  );
}
