package expo.modules.smsbridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import org.json.JSONObject

/** Persists incoming SMS and makes sure the gateway (and therefore JS) is running to upload it. */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    // Multipart messages arrive as several PDUs from the same sender: join them.
    val bySender = LinkedHashMap<String, StringBuilder>()
    for (p in parts) {
      val from = p.originatingAddress ?: continue
      bySender.getOrPut(from) { StringBuilder() }.append(p.messageBody ?: "")
    }
    for ((from, body) in bySender) {
      SmsEventStore.add(
        context,
        JSONObject().put("type", "incoming").put("phone", from).put("body", body.toString())
      )
    }
    if (GatewayPrefs.isEnabled(context)) {
      try {
        GatewayService.start(context)
      } catch (_: Exception) {
        // Event is persisted; it will be uploaded next time the engine starts.
      }
    }
  }
}
