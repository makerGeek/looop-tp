import { NativeModule, requireNativeModule } from 'expo';

export type SmsEvent =
  | { eventId: string; ts: number; type: 'incoming'; phone: string; body: string }
  | {
      eventId: string;
      ts: number;
      type: 'status';
      id: string;
      status: 'sent' | 'delivered' | 'failed';
      error?: string;
    };

declare class SmsBridgeModule extends NativeModule<{ onEvents: (e: { pending: boolean }) => void }> {
  sendSms(id: string, to: string, body: string): Promise<void>;
  peekEvents(): Promise<string>;
  ackEvents(ids: string[]): Promise<void>;
  startService(): Promise<void>;
  stopService(): Promise<void>;
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  requestIgnoreBatteryOptimizations(): Promise<void>;
}

export default requireNativeModule<SmsBridgeModule>('SmsBridge');
