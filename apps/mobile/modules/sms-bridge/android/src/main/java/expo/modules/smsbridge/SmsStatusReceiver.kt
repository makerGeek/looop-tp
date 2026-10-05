package expo.modules.smsbridge

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager
import org.json.JSONObject

/** Receives SmsManager sent/delivery results and records them as status events. */
class SmsStatusReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(EXTRA_ID) ?: return
    val part = intent.getIntExtra(EXTRA_PART, 0)
    val parts = intent.getIntExtra(EXTRA_PARTS, 1)
    val isDelivery = intent.action == ACTION_DELIVERED
    val ok = resultCode == Activity.RESULT_OK
    val last = part == parts - 1

    val event = JSONObject().put("type", "status").put("id", id)
    when {
      !ok && !isDelivery -> event.put("status", "failed").put("error", errorName(resultCode))
      !ok && isDelivery -> event.put("status", "failed").put("error", "delivery failed")
      last -> event.put("status", if (isDelivery) "delivered" else "sent")
      else -> return // intermediate part of a multipart message
    }
    SmsEventStore.add(context, event)
  }

  private fun errorName(code: Int) = when (code) {
    SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "generic failure"
    SmsManager.RESULT_ERROR_NO_SERVICE -> "no service"
    SmsManager.RESULT_ERROR_NULL_PDU -> "null pdu"
    SmsManager.RESULT_ERROR_RADIO_OFF -> "radio off"
    else -> "error $code"
  }

  companion object {
    const val ACTION_SENT = "expo.modules.smsbridge.SMS_SENT"
    const val ACTION_DELIVERED = "expo.modules.smsbridge.SMS_DELIVERED"
    const val EXTRA_ID = "id"
    const val EXTRA_PART = "part"
    const val EXTRA_PARTS = "parts"
  }
}
