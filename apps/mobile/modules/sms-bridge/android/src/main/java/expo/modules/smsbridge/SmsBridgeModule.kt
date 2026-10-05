package expo.modules.smsbridge

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.telephony.SmsManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsBridgeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "React context unavailable", null)

  override fun definition() = ModuleDefinition {
    Name("SmsBridge")

    Events("onEvents")

    OnCreate {
      SmsEventStore.listener = { sendEvent("onEvents", mapOf("pending" to true)) }
    }
    OnDestroy {
      SmsEventStore.listener = null
    }

    /** Sends an SMS. Results arrive later as status events (peekEvents). */
    AsyncFunction("sendSms") { id: String, to: String, body: String ->
      val sms = smsManager()
      val parts = sms.divideMessage(body)
      val sent = ArrayList<PendingIntent>()
      val delivered = ArrayList<PendingIntent>()
      for (i in parts.indices) {
        sent.add(statusIntent(SmsStatusReceiver.ACTION_SENT, id, i, parts.size))
        delivered.add(statusIntent(SmsStatusReceiver.ACTION_DELIVERED, id, i, parts.size))
      }
      if (parts.size == 1) {
        sms.sendTextMessage(to, null, body, sent[0], delivered[0])
      } else {
        sms.sendMultipartTextMessage(to, null, parts, sent, delivered)
      }
    }

    AsyncFunction("peekEvents") { SmsEventStore.peek(context) }

    AsyncFunction("ackEvents") { ids: List<String> -> SmsEventStore.ack(context, ids) }

    /** Enables the foreground service (persisted so it restarts after reboot). */
    AsyncFunction("startService") {
      GatewayPrefs.setEnabled(context, true)
      GatewayService.start(context)
    }

    AsyncFunction("stopService") {
      GatewayPrefs.setEnabled(context, false)
      GatewayService.stop(context)
    }

    AsyncFunction("isIgnoringBatteryOptimizations") {
      val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    AsyncFunction("requestIgnoreBatteryOptimizations") {
      val intent = Intent(
        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
        Uri.parse("package:${context.packageName}")
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }

  private fun smsManager(): SmsManager =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) context.getSystemService(SmsManager::class.java)
    else @Suppress("DEPRECATION") SmsManager.getDefault()

  private fun statusIntent(action: String, id: String, part: Int, parts: Int): PendingIntent {
    val intent = Intent(context, SmsStatusReceiver::class.java).setAction(action)
      .putExtra(SmsStatusReceiver.EXTRA_ID, id)
      .putExtra(SmsStatusReceiver.EXTRA_PART, part)
      .putExtra(SmsStatusReceiver.EXTRA_PARTS, parts)
    // Unique request code per (action, message, part) so PendingIntents don't collapse.
    val requestCode = "$action/$id/$part".hashCode()
    return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }
}
