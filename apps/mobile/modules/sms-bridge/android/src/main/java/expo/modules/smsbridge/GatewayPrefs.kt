package expo.modules.smsbridge

import android.content.Context

/** Remembers whether the user is logged in / wants the gateway running (survives reboots). */
object GatewayPrefs {
  private const val PREFS = "sms_bridge_prefs"
  private const val ENABLED = "enabled"

  fun isEnabled(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(ENABLED, false)

  fun setEnabled(context: Context, enabled: Boolean) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(ENABLED, enabled).apply()
  }
}
