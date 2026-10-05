import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Contact, Device, Message } from '@sms/shared';
import { supabase } from './supabase';

/** Refetches the given query key whenever a row in `table` changes. */
function useRealtimeInvalidate(table: string, queryKey: string[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel(`web-${table}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () =>
        qc.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc, table, queryKey.join('/')]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useMessages() {
  useRealtimeInvalidate('messages', ['messages']);
  return useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages').select('*').order('created_at', { ascending: false }).limit(1000);
      if (error) throw error;
      return data as Message[];
    },
  });
}

export function useDevices() {
  useRealtimeInvalidate('devices', ['devices']);
  return useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devices').select('*').order('last_seen_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Device[];
    },
    refetchInterval: 15_000, // online/offline is time-derived
  });
}

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('*').order('name');
      if (error) throw error;
      return data as Contact[];
    },
  });
}
