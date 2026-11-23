import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const CONFIG_KEY = 'sms_gateway_server';

function readStored(): { url: string; key: string } | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function make(url: string, key: string): SupabaseClient {
  return createClient(url, key);
}

// Built-in server (publishable key is public by design; access is enforced by RLS).
const DEFAULT_URL = 'https://xwhaqkzmkficvjmsbnbn.supabase.co';
const DEFAULT_KEY = 'sb_publishable_k9gZItk7HY9JBjvSc8Az-g_-5XbQxPz';

// Server config entered in the UI wins, then build-time VITE_* values, then the built-in defaults.
const initial = readStored() ?? {
  url: (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL,
  key: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_KEY,
};

let client: SupabaseClient | null = initial.url && initial.key ? make(initial.url, initial.key) : null;

export const isConfigured = () => client !== null;
export const getConfig = () => readStored() ?? (client ? initial : null);

export function saveConfig(url: string, key: string) {
  const clean = { url: url.trim().replace(/\/+$/, ''), key: key.trim() };
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(clean));
  } catch {
    // storage blocked: config lasts for this tab only
  }
  client = make(clean.url, clean.key);
}

export function clearConfig() {
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch {
    /* ignore */
  }
  client = null;
}

/** Lazy handle so modules can import `supabase` statically; valid once isConfigured(). */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!client) throw new Error('Supabase is not configured yet');
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
