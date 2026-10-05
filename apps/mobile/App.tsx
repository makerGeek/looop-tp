import { useCallback, useEffect, useReducer, useState } from 'react';
import {
  ActivityIndicator, Alert, AppState, Button, PermissionsAndroid, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import SmsBridge from './modules/sms-bridge';
import { engine } from './src/engine';
import { getConfig, loadConfig, saveConfig, supabase } from './src/supabase';

async function requestPermissions(): Promise<boolean> {
  const wanted = [
    PermissionsAndroid.PERMISSIONS.SEND_SMS,
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ...(Number(Platform.Version) >= 33 ? [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] : []),
  ];
  const res = await PermissionsAndroid.requestMultiple(wanted);
  return res[PermissionsAndroid.PERMISSIONS.SEND_SMS] === 'granted'
    && res[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === 'granted';
}

export default function App() {
  const [ready, setReady] = useState<boolean | undefined>(undefined);
  const [editingServer, setEditingServer] = useState(false);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => { loadConfig().then(setReady); }, []);

  useEffect(() => {
    if (!ready) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [ready]);

  if (ready === undefined) return <SafeAreaView style={styles.center}><ActivityIndicator /></SafeAreaView>;
  if (!ready || editingServer) {
    return <ServerConfig onDone={() => { setReady(true); setEditingServer(false); }} canCancel={ready && editingServer}
      onCancel={() => setEditingServer(false)} />;
  }
  if (session === undefined) return <SafeAreaView style={styles.center}><ActivityIndicator /></SafeAreaView>;
  return session ? <Home session={session} /> : <Login onEditServer={() => setEditingServer(true)} />;
}

function ServerConfig({ onDone, onCancel, canCancel }: { onDone: () => void; onCancel: () => void; canCancel: boolean }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');

  useEffect(() => { getConfig().then((c) => { if (c) { setUrl(c.url); setKey(c.key); } }); }, []);

  async function save() {
    if (!/^https?:\/\//.test(url.trim()) || !key.trim()) {
      return Alert.alert('Invalid', 'Enter the Supabase project URL (https://xxxx.supabase.co) and the anon key.');
    }
    await saveConfig(url, key);
    onDone();
  }

  return (
    <SafeAreaView style={styles.center}>
      <Text style={styles.h1}>Server</Text>
      <Text style={{ marginBottom: 12 }}>Your Supabase project URL and anon (public) key — same ones as the web app.</Text>
      <TextInput style={styles.input} placeholder="https://xxxx.supabase.co" autoCapitalize="none" autoCorrect={false}
        keyboardType="url" value={url} onChangeText={setUrl} />
      <TextInput style={styles.input} placeholder="Anon key" autoCapitalize="none" autoCorrect={false}
        value={key} onChangeText={setKey} />
      <Button title="Save" onPress={save} />
      {canCancel && <View style={{ marginTop: 8 }}><Button title="Cancel" color="#666" onPress={onCancel} /></View>}
    </SafeAreaView>
  );
}

function Login({ onEditServer }: { onEditServer: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) Alert.alert('Sign in failed', error.message);
  }

  return (
    <SafeAreaView style={styles.center}>
      <Text style={styles.h1}>SMS Gateway</Text>
      <Text style={{ marginBottom: 12 }}>Sign in with the same account you use on the web app.</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={signIn} disabled={busy} />
      <View style={{ marginTop: 16 }}><Button title="Server settings" color="#666" onPress={onEditServer} /></View>
    </SafeAreaView>
  );
}

function Home({ session }: { session: Session }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [permsOk, setPermsOk] = useState<boolean | null>(null);
  const [batteryOk, setBatteryOk] = useState<boolean | null>(null);

  const refreshStatus = useCallback(async () => {
    const sms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
    const recv = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
    setPermsOk(sms && recv);
    setBatteryOk(await SmsBridge.isIgnoringBatteryOptimizations());
  }, []);

  useEffect(() => {
    engine.getDeviceName().then(setName);
    engine.getCountryCode().then(setCountry);
    refreshStatus();
    const unsub = engine.subscribe(rerender);
    // Starting the foreground service keeps everything alive in the background.
    SmsBridge.startService().catch((e) => Alert.alert('Could not start service', String(e)));
    engine.start();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refreshStatus(); });
    return () => { unsub(); sub.remove(); };
  }, [refreshStatus]);

  async function signOut() {
    await SmsBridge.stopService();
    await engine.stop();
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={styles.h1}>SMS Gateway</Text>
        <Text>{session.user.email}</Text>
        <Text style={{ color: engine.connected ? 'green' : 'darkorange', fontWeight: '600' }}>
          {engine.connected ? '● Connected — ready to send' : '● Connecting…'}
        </Text>

        {permsOk === false && (
          <Button title="Grant SMS permissions" onPress={async () => { await requestPermissions(); refreshStatus(); }} />
        )}
        {batteryOk === false && (
          <View>
            <Text style={{ marginBottom: 6 }}>
              Battery optimization may stop the gateway while the screen is off. Allow unrestricted background use:
            </Text>
            <Button title="Disable battery optimization" onPress={() => SmsBridge.requestIgnoreBatteryOptimizations()} />
          </View>
        )}

        <Text style={styles.label}>Device name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} onEndEditing={() => engine.setDeviceName(name)} />
        <Text style={styles.label}>Default country code (for local numbers, e.g. 1 or 33)</Text>
        <TextInput style={styles.input} value={country} keyboardType="number-pad"
          onChangeText={setCountry} onEndEditing={() => engine.setCountryCode(country)} />

        <Text style={styles.label}>Activity</Text>
        {engine.log.length === 0 && <Text style={{ color: '#888' }}>Nothing yet.</Text>}
        {engine.log.map((l, i) => <Text key={i} style={{ fontFamily: 'monospace', fontSize: 12 }}>{l}</Text>)}

        <Button title="Sign out" color="#b00" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  h1: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  label: { fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 8 },
});
