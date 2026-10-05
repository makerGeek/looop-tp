# SMS Gateway

Send and receive SMS from a web app, using an Android phone as the gateway.

```
Web (React) ──insert row──▶ Supabase Postgres ◀──Realtime──▶ Android app (Expo + native SMS module)
                              (Auth + RLS)                    foreground service, runs in background
```

- `apps/web` – React + Vite web client: inbox/conversations, compose/reply, contacts, device status.
- `apps/mobile` – Expo (dev-client) Android app. A local native module (`modules/sms-bridge`, Kotlin) sends SMS via `SmsManager`, receives SMS via a manifest receiver, and runs a foreground service so it keeps working with the app closed / screen off.
- `supabase/` – schema + RLS migration (`devices`, `contacts`, `messages`), Realtime enabled.
- `packages/shared` – shared types and helpers (E.164 normalization, thread grouping, device presence).

## How it works
1. User signs up/in on the web, then signs in with **the same email + password** on the phone. The phone auto-registers as a device.
2. Web sends a message by inserting a `messages` row (`direction=out`, `status=queued`) for the device.
3. The phone gets it over Realtime (plus a 60s catch-up poll), atomically claims it (`queued→sending`), sends the SMS, and reports `sent` / `delivered` / `failed`.
4. Incoming SMS are stored natively first (durable), then uploaded as `direction=in` rows; the inbox updates live.
5. Messages stay `queued` while the phone is offline and go out when it reconnects.

## Setup
### 1. Supabase
Create a project (or `supabase start` locally) and apply `supabase/migrations/*.sql` (`supabase db push`). For quick testing disable email confirmation (Auth → Providers → Email).

### 2. Web
```
cp apps/web/.env.example apps/web/.env   # fill in URL + anon key
npm install
npm run web
```

### 3. Android app
Needs a real build (Expo Go cannot send SMS).
```
cp apps/mobile/.env.example apps/mobile/.env   # EXPO_PUBLIC_* values
cd apps/mobile
npx eas build -p android --profile preview      # installable APK
# or locally, with Android SDK: npx expo run:android
```
Open the app, sign in, grant SMS permissions, and disable battery optimization when prompted. A persistent notification shows the gateway is running.

## Notes / limits
- Google Play restricts SMS permissions to default-SMS-handler apps; distribute as a sideloaded APK.
- Some OEMs (Xiaomi, Huawei, Samsung…) kill background apps aggressively; also lock the app in recents and allow auto-start.
- Carriers rate-limit; the app spaces sends ~1.5s apart. Long texts are sent as multipart.
- Scheduling/automation is intentionally not in v1 (the queue model makes it a small addition: a cron job inserting `queued` rows).
- The Kotlin module was not compiled or run in the authoring environment (no Android SDK/device); expect to test on a phone.
