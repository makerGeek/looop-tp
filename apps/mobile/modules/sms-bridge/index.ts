import SmsBridge, { type SmsEvent } from './src/SmsBridgeModule';

export type { SmsEvent };
export default SmsBridge;

export async function peekEvents(): Promise<SmsEvent[]> {
  return JSON.parse(await SmsBridge.peekEvents()) as SmsEvent[];
}
