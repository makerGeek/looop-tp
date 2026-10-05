import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configured = !!url && !!key;
// Placeholder values keep the app renderable (showing a setup hint) when env is missing.
export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'missing');
