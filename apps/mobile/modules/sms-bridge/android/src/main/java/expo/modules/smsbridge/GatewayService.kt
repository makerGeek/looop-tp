package expo.modules.smsbridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Foreground service that keeps the process (and therefore the React Native JS runtime and the
 * realtime websocket) alive. It runs a never-ending headless JS task ("SmsGatewayRun") that starts
 * the sync engine; this also boots JS after a device restart or when an SMS wakes a dead app.
 */
class GatewayService : HeadlessJsTaskService() {
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }
    startInForeground()
    return super.onStartCommand(intent, flags, startId)
  }

  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig =
    // timeout 0 = no timeout; allowedInForeground so it also runs while the UI is open.
    HeadlessJsTaskConfig("SmsGatewayRun", Arguments.createMap(), 0, true)

  private fun startInForeground() {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      nm.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "SMS gateway", NotificationManager.IMPORTANCE_LOW)
      )
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val tap = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE)
    val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("SMS gateway is running")
      .setContentText("Sending and receiving messages for your account")
      .setSmallIcon(android.R.drawable.stat_notify_chat)
      .setOngoing(true)
      .setContentIntent(tap)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  companion object {
    const val ACTION_STOP = "expo.modules.smsbridge.STOP"
    private const val CHANNEL_ID = "sms_gateway"
    private const val NOTIFICATION_ID = 4242

    fun start(context: Context) {
      context.startForegroundService(Intent(context, GatewayService::class.java))
    }

    fun stop(context: Context) {
      // Delivered via onStartCommand so we can drop the notification cleanly.
      context.startService(Intent(context, GatewayService::class.java).setAction(ACTION_STOP))
    }
  }
}
