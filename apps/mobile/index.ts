import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';
import { engine } from './src/engine';
import { loadConfig } from './src/supabase';

registerRootComponent(App);

// Run by the native GatewayService (foreground service). It never resolves, so the service —
// and with it the process, JS runtime and realtime socket — stays alive. Also runs after reboot
// or when an incoming SMS wakes a dead app.
AppRegistry.registerHeadlessTask('SmsGatewayRun', () => async () => {
  if (await loadConfig()) await engine.start();
  await new Promise<never>(() => {});
});
