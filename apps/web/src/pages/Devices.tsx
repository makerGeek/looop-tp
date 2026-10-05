import { isDeviceOnline } from '@sms/shared';
import { useDevices } from '../lib/hooks';
import { supabase } from '../lib/supabase';

export default function Devices() {
  const { data: devices = [], refetch } = useDevices();

  return (
    <div className="p-4">
      <h2 className="mb-3 text-lg font-semibold">Devices</h2>
      {devices.length === 0 && (
        <p className="text-slate-600">
          No phone yet. Install the Android app and sign in with this same account — it registers itself.
        </p>
      )}
      <ul className="space-y-2">
        {devices.map((d) => {
          const online = isDeviceOnline(d);
          return (
            <li key={d.id} className="flex items-center gap-3 rounded bg-white p-3 shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-green-500' : 'bg-slate-300'}`} />
              <span className="font-medium">{d.name}</span>
              <span className="text-sm text-slate-500">
                {online ? 'online' : d.last_seen_at ? `last seen ${new Date(d.last_seen_at).toLocaleString()}` : 'never seen'}
              </span>
              <button className="ml-auto text-sm text-red-600 underline"
                onClick={async () => { await supabase.from('devices').delete().eq('id', d.id); refetch(); }}>
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
