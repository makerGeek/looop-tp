import { FormEvent, useState } from 'react';
import { toE164 } from '@sms/shared';
import { useContacts } from '../lib/hooks';
import { supabase } from '../lib/supabase';

export default function Contacts() {
  const { data: contacts = [], refetch } = useContacts();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    const e164 = toE164(phone);
    if (!e164) return setError('Enter the number in international format, e.g. +14155552671');
    const { error } = await supabase.from('contacts').insert({ name, phone_e164: e164 });
    if (error) return setError(error.message);
    setError(null); setName(''); setPhone(''); refetch();
  }

  return (
    <div className="p-4">
      <h2 className="mb-3 text-lg font-semibold">Contacts</h2>
      <form onSubmit={add} className="mb-4 flex flex-wrap gap-2">
        <input className="rounded border p-2" required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded border p-2" required placeholder="+14155552671" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="rounded bg-slate-900 px-4 text-white">Add</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded bg-white shadow-sm">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center gap-3 p-3">
            <span className="font-medium">{c.name}</span>
            <span className="text-slate-500">{c.phone_e164}</span>
            <button className="ml-auto text-sm text-red-600 underline"
              onClick={async () => { await supabase.from('contacts').delete().eq('id', c.id); refetch(); }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
