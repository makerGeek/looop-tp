export type MessageDirection = 'out' | 'in';
export type MessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'received';

export interface Device {
  id: string;
  user_id: string;
  name: string;
  last_seen_at: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone_e164: string;
  created_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  device_id: string | null;
  contact_id: string | null;
  phone: string;
  body: string;
  direction: MessageDirection;
  status: MessageStatus;
  error: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
}

/** A device counts as online if it heart-beat within this window. */
export const DEVICE_ONLINE_WINDOW_MS = 90_000;
export const HEARTBEAT_INTERVAL_MS = 30_000;

export function isDeviceOnline(d: Pick<Device, 'last_seen_at'>, now = Date.now()): boolean {
  return !!d.last_seen_at && now - new Date(d.last_seen_at).getTime() < DEVICE_ONLINE_WINDOW_MS;
}

/** Normalises user input to E.164, returns null if it can't be a valid number. */
export function toE164(input: string, defaultCountryCode = ''): string | null {
  let s = input.trim().replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (!s.startsWith('+')) {
    if (!defaultCountryCode) return null;
    s = '+' + defaultCountryCode.replace(/^\+/, '') + s.replace(/^0+/, '');
  }
  return /^\+[1-9]\d{6,14}$/.test(s) ? s : null;
}

export interface Thread {
  phone: string;
  messages: Message[];
  last: Message;
}

/** Groups messages by phone number; threads sorted by latest message, messages oldest→newest. */
export function groupThreads(messages: Message[]): Thread[] {
  const map = new Map<string, Message[]>();
  for (const m of messages) {
    const list = map.get(m.phone);
    if (list) list.push(m);
    else map.set(m.phone, [m]);
  }
  const threads: Thread[] = [];
  for (const [phone, list] of map) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    threads.push({ phone, messages: list, last: list[list.length - 1] });
  }
  return threads.sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
}
