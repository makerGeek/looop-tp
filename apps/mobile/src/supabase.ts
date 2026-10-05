import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const CONFIG_KEY = 'server_config';

let client: SupabaseClient | null = null;

function make(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Loads the server config: values entered in the app win, build-time EXPO_PUBLIC_* are the
 * fallback. Must resolve before anything touches `supabase` (UI and headless task both await it).
 */
export async function loadConfig(): Promise<boolean> {
  if (client) return true;
  let url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  let key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    if (raw) ({ url, key } = JSON.parse(raw));
  } catch {
    // fall back to build-time values
  }
  if (!url || !key) return false;
  client = make(url, key);
  return true;
}

export async function getConfig(): Promise<{ url: string; key: string } | null> {
  const raw = await AsyncStorage.getItem(CONFIG_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveConfig(url: string, key: string) {
  const clean = { url: url.trim().replace(/\/+$/, ''), key: key.trim() };
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(clean));
  client = make(clean.url, clean.key);
}

/** Lazy handle so modules can import `supabase` statically; valid once loadConfig() resolved. */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!client) throw new Error('Supabase is not configured yet');
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
