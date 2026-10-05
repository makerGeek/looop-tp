import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { HEARTBEAT_INTERVAL_MS, toE164, type Message } from '@sms/shared';
import SmsBridge, { peekEvents, type SmsEvent } from '../modules/sms-bridge';
import { supabase } from './supabase';

const DEVICE_ID_KEY = 'device_id';
const DEVICE_NAME_KEY = 'device_name';
const COUNTRY_KEY = 'default_country_code';
const CATCH_UP_INTERVAL_MS = 60_000;
/** A row stuck in `sending` this long was interrupted (app killed mid-send). */
const STUCK_SENDING_MS = 2 * 60_000;
/** Pause between sends to stay under carrier/OS SMS rate limits. */
const SEND_GAP_MS = 1_500;

type Listener = () => void;

/**
 * The gateway engine. Lives in the JS runtime that the foreground service keeps alive, so it is
 * a singleton: both the UI and the headless task call start(), only the first call does work.
 */
class Engine {
  private started = false;
  private channel: RealtimeChannel | null = null;
  private timers: ReturnType<typeof setInterval>[] = [];
  private deviceId: string | null = null;
  private processing = false;
  private draining = false;
  private bridgeSub: { remove(): void } | null = null;
  private listeners = new Set<Listener>();

  log: string[] = [];
  connected = false;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private note(line: string) {
    this.log = [`${new Date().toLocaleTimeString()} ${line}`, ...this.log].slice(0, 50);
    this.listeners.forEach((l) => l());
  }

  async getDeviceName() {
    return (await AsyncStorage.getItem(DEVICE_NAME_KEY)) ?? 'My Android phone';
  }
  async setDeviceName(name: string) {
    await AsyncStorage.setItem(DEVICE_NAME_KEY, name);
    if (this.deviceId) await supabase.from('devices').update({ name }).eq('id', this.deviceId);
  }
  async getCountryCode() {
    return (await AsyncStorage.getItem(COUNTRY_KEY)) ?? '';
  }
  async setCountryCode(code: string) {
    await AsyncStorage.setItem(COUNTRY_KEY, code.replace(/\D/g, ''));
  }

  async start() {
    if (this.started) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return; // not logged in; UI calls start() again after login
    this.started = true;
    supabase.auth.startAutoRefresh(); // RN only auto-refreshes while foregrounded otherwise

    try {
      this.deviceId = await this.ensureDevice();
    } catch (e) {
      this.started = false;
      this.note(`device registration failed: ${String(e)}`);
      return;
    }

    this.bridgeSub = SmsBridge.addListener('onEvents', () => void this.drainEvents());
    this.timers.push(setInterval(() => void this.heartbeat(), HEARTBEAT_INTERVAL_MS));
    this.timers.push(setInterval(() => void this.catchUp(), CATCH_UP_INTERVAL_MS));
    this.subscribeRealtime();
    await this.heartbeat();
    await this.recoverStuck();
    await this.catchUp();
    this.note('gateway started');
  }

  async stop() {
    this.started = false;
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.bridgeSub?.remove();
    this.bridgeSub = null;
    if (this.channel) await supabase.removeChannel(this.channel);
    this.channel = null;
    this.deviceId = null;
    this.connected = false;
    this.note('gateway stopped');
  }

  private async ensureDevice(): Promise<string> {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      // Might have been removed from the web app, or belong to another account after re-login.
      const { data } = await supabase.from('devices').select('id').eq('id', existing).maybeSingle();
      if (data) return existing;
    }
    const { data, error } = await supabase
      .from('devices')
      .insert({ name: await this.getDeviceName(), last_seen_at: new Date().toISOString() })
      .select('id')
      .single();
    if (error) throw error;
    await AsyncStorage.setItem(DEVICE_ID_KEY, data.id);
    return data.id;
  }

  private subscribeRealtime() {
    this.channel = supabase
      .channel(`device-${this.deviceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `device_id=eq.${this.deviceId}` },
        () => void this.processQueue(),
      )
      .subscribe((status) => {
        this.connected = status === 'SUBSCRIBED';
        this.listeners.forEach((l) => l());
        // After (re)connect we may have missed inserts.
        if (this.connected) void this.catchUp();
      });
  }

  private async heartbeat() {
    if (!this.deviceId) return;
    const { error } = await supabase
      .from('devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', this.deviceId);
    if (error) this.note(`heartbeat failed: ${error.message}`);
  }

  private async recoverStuck() {
    const cutoff = new Date(Date.now() - STUCK_SENDING_MS).toISOString();
    // Don't auto-resend: we can't know if the SMS actually left. Mark failed so the user decides.
    await supabase
      .from('messages')
      .update({ status: 'failed', error: 'interrupted while sending' })
      .eq('device_id', this.deviceId!)
      .eq('status', 'sending')
      .lt('created_at', cutoff);
  }

  private async catchUp() {
    await this.drainEvents();
    await this.processQueue();
  }

  /** Sends queued messages one at a time, claiming each atomically so it is never sent twice. */
  private async processQueue() {
    if (this.processing || !this.deviceId) return;
    this.processing = true;
    try {
      for (;;) {
        const { data: queued, error } = await supabase
          .from('messages')
          .select('id')
          .eq('device_id', this.deviceId)
          .eq('direction', 'out')
          .eq('status', 'queued')
          .order('created_at')
          .limit(20);
        if (error) return this.note(`queue fetch failed: ${error.message}`);
        if (!queued?.length) return;

        for (const { id } of queued) {
          const { data: claimed } = await supabase
            .from('messages')
            .update({ status: 'sending' })
            .eq('id', id)
            .eq('status', 'queued')
            .select('*')
            .maybeSingle();
          if (!claimed) continue; // someone else got it
          await this.send(claimed as Message);
          await new Promise((r) => setTimeout(r, SEND_GAP_MS));
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async send(m: Message) {
    try {
      await SmsBridge.sendSms(m.id, m.phone, m.body);
      this.note(`sending to ${m.phone}`);
      // Final status (sent/delivered/failed) arrives via native status events.
    } catch (e) {
      this.note(`send failed: ${String(e)}`);
      await supabase.from('messages').update({ status: 'failed', error: String(e).slice(0, 200) }).eq('id', m.id);
    }
  }

  /** Uploads durable native events (incoming SMS, send results); acks only after success. */
  private async drainEvents() {
    if (this.draining || !this.deviceId) return;
    this.draining = true;
    try {
      const events = await peekEvents();
      const done: string[] = [];
      const country = await this.getCountryCode();
      for (const ev of events.sort((a, b) => a.ts - b.ts)) {
        if (await this.upload(ev, country)) done.push(ev.eventId);
      }
      if (done.length) await SmsBridge.ackEvents(done);
    } catch (e) {
      this.note(`event drain failed: ${String(e)}`);
    } finally {
      this.draining = false;
    }
  }

  /** @returns true if the event can be dropped from the native queue. */
  private async upload(ev: SmsEvent, country: string): Promise<boolean> {
    if (ev.type === 'incoming') {
      const phone = toE164(ev.phone, country);
      if (!phone) {
        this.note(`ignored SMS from non-numeric sender ${ev.phone}`);
        return true;
      }
      // eventId doubles as message id → retries are idempotent.
      const { error } = await supabase.from('messages').insert({
        id: ev.eventId,
        device_id: this.deviceId,
        phone,
        body: ev.body,
        direction: 'in',
        status: 'received',
        created_at: new Date(ev.ts).toISOString(),
      });
      if (error && error.code !== '23505') {
        this.note(`upload incoming failed: ${error.message}`);
        return false;
      }
      this.note(`received SMS from ${phone}`);
      return true;
    }

    const patch: Record<string, unknown> = { status: ev.status };
    const at = new Date(ev.ts).toISOString();
    if (ev.status === 'sent') patch.sent_at = at;
    if (ev.status === 'delivered') patch.delivered_at = at;
    if (ev.status === 'failed') patch.error = ev.error ?? 'failed';
    const { error } = await supabase.from('messages').update(patch).eq('id', ev.id);
    if (error) {
      this.note(`status update failed: ${error.message}`);
      return false;
    }
    return true;
  }
}

export const engine = new Engine();
