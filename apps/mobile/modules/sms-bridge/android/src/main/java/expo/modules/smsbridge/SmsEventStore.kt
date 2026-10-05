package expo.modules.smsbridge

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * Durable queue of events produced by broadcast receivers (incoming SMS, send/delivery results).
 * Receivers may run while JS is not up, so events are persisted in SharedPreferences and drained
 * (peek + ack) by the JS engine, which only acks after uploading them to the server.
 */
object SmsEventStore {
  private const val PREFS = "sms_bridge_events"
  private const val KEY = "events"

  /** Set by the Expo module while JS is alive; lets receivers nudge JS immediately. */
  @Volatile
  var listener: (() -> Unit)? = null

  @Synchronized
  fun add(context: Context, event: JSONObject) {
    event.put("eventId", UUID.randomUUID().toString())
    event.put("ts", System.currentTimeMillis())
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val arr = JSONArray(prefs.getString(KEY, "[]"))
    arr.put(event)
    prefs.edit().putString(KEY, arr.toString()).apply()
    listener?.invoke()
  }

  @Synchronized
  fun peek(context: Context): String =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]") ?: "[]"

  @Synchronized
  fun ack(context: Context, ids: Collection<String>) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val arr = JSONArray(prefs.getString(KEY, "[]"))
    val keep = JSONArray()
    for (i in 0 until arr.length()) {
      val e = arr.getJSONObject(i)
      if (e.getString("eventId") !in ids) keep.put(e)
    }
    prefs.edit().putString(KEY, keep.toString()).apply()
  }
}
