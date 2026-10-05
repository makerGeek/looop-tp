package expo.modules.smsbridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restarts the gateway after reboot/app update, but only if the user enabled it. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (GatewayPrefs.isEnabled(context)) {
      GatewayService.start(context)
    }
  }
}
