import { describe, expect, it } from 'vitest';
import { groupThreads, isDeviceOnline, toE164, type Message } from './index';

const msg = (id: string, phone: string, created_at: string): Message => ({
  id, user_id: 'u', device_id: 'd', contact_id: null, phone, body: id,
  direction: 'in', status: 'received', error: null, created_at, sent_at: null, delivered_at: null,
});

describe('toE164', () => {
  it('accepts valid numbers', () => {
    expect(toE164('+1 (415) 555-2671')).toBe('+14155552671');
    expect(toE164('0033612345678')).toBe('+33612345678');
    expect(toE164('06 12 34 56 78', '33')).toBe('+33612345678');
  });
  it('rejects invalid', () => {
    expect(toE164('12345')).toBeNull();
    expect(toE164('+0123456789')).toBeNull();
    expect(toE164('abc')).toBeNull();
  });
});

describe('groupThreads', () => {
  it('groups and sorts', () => {
    const t = groupThreads([
      msg('1', '+1', '2025-01-01T00:00:00Z'),
      msg('2', '+2', '2025-01-03T00:00:00Z'),
      msg('3', '+1', '2025-01-02T00:00:00Z'),
    ]);
    expect(t.map((x) => x.phone)).toEqual(['+2', '+1']);
    expect(t[1].messages.map((m) => m.id)).toEqual(['1', '3']);
  });
});

describe('isDeviceOnline', () => {
  it('uses the heartbeat window', () => {
    const now = Date.now();
    expect(isDeviceOnline({ last_seen_at: new Date(now - 10_000).toISOString() }, now)).toBe(true);
    expect(isDeviceOnline({ last_seen_at: new Date(now - 200_000).toISOString() }, now)).toBe(false);
    expect(isDeviceOnline({ last_seen_at: null }, now)).toBe(false);
  });
});
