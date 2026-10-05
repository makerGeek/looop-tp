import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { groupThreads, isDeviceOnline, toE164, type Message } from '@sms/shared';
import { useContacts, useDevices, useMessages } from '../lib/hooks';
import { supabase } from '../lib/supabase';

const statusLabel: Record<Message['status'], string> = {
  queued: 'queued', sending: 'sending…', sent: 'sent', delivered: 'delivered', failed: 'failed', received: '',
};

export default function Inbox() {
  const { data: messages = [] } = useMessages();
  const { data: contacts = [] } = useContacts();
  const { data: devices = [] } = useDevices();
  const [selected, setSelected] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const threads = useMemo(() => groupThreads(messages), [messages]);
  const nameFor = (phone: string) => contacts.find((c) => c.phone_e164 === phone)?.name ?? phone;
  const thread = threads.find((t) => t.phone === selected);
  const device = devices[0]; // most recently seen
  const online = device ? isDeviceOnline(device) : false;

  useEffect(() => { bottom.current?.scrollIntoView(); }, [thread?.messages.length, selected]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const phone = selected ?? toE164(newNumber);
    if (!phone) return setError('Enter a number in international format, e.g. +14155552671');
    if (!device) return setError('No device registered yet — sign in on the Android app first.');
    const { error } = await supabase.from('messages').insert({
      device_id: device.id, phone, body, direction: 'out', status: 'queued',
      contact_id: contacts.find((c) => c.phone_e164 === phone)?.id ?? null,
    });
    if (error) return setError(error.message);
    setError(null); setBody(''); setSelected(phone); setNewNumber('');
  }

  return (
    <div className="flex h-full">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
        <button className="w-full border-b p-3 text-left text-sm font-medium text-blue-700" onClick={() => setSelected(null)}>
          + New message
        </button>
        {threads.map((t) => (
          <button key={t.phone} onClick={() => setSelected(t.phone)}
            className={`block w-full border-b p-3 text-left ${selected === t.phone ? 'bg-slate-100' : ''}`}>
            <div className="font-medium">{nameFor(t.phone)}</div>
            <div className="truncate text-sm text-slate-500">{t.last.direction === 'out' ? 'You: ' : ''}{t.last.body}</div>
          </button>
        ))}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-slate-200 p-3 text-sm">
          {selected ? <span className="font-medium">{nameFor(selected)} <span className="text-slate-500">{selected}</span></span> : (
            <input className="w-64 rounded border p-1.5" placeholder="To: +14155552671" list="contacts"
              value={newNumber} onChange={(e) => setNewNumber(e.target.value)} />
          )}
          <datalist id="contacts">{contacts.map((c) => <option key={c.id} value={c.phone_e164}>{c.name}</option>)}</datalist>
          <span className={`float-right ${online ? 'text-green-600' : 'text-amber-600'}`}>
            {device ? `${device.name}: ${online ? 'online' : 'offline (messages stay queued)'}` : 'no device'}
          </span>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {thread?.messages.map((m) => (
            <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : ''}`}>
              <div className={`max-w-[70%] rounded-lg px-3 py-2 ${m.direction === 'out' ? 'bg-blue-600 text-white' : 'bg-white shadow-sm'}`}>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`mt-1 text-xs ${m.direction === 'out' ? 'text-blue-100' : 'text-slate-400'}`}>
                  {new Date(m.created_at).toLocaleString()} {statusLabel[m.status]}
                  {m.status === 'failed' && m.error ? ` (${m.error})` : ''}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottom} />
        </div>

        <form onSubmit={send} className="border-t border-slate-200 p-3">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <textarea className="min-h-10 flex-1 rounded border p-2" required maxLength={1600} rows={2}
              placeholder="Type a message" value={body} onChange={(e) => setBody(e.target.value)} />
            <button className="rounded bg-slate-900 px-4 text-white">Send</button>
          </div>
        </form>
      </section>
    </div>
  );
}
