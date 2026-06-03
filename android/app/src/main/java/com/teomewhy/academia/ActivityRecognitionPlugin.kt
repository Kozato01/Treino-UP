package com.teomewhy.academia

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityRecognitionResult
import com.google.android.gms.location.DetectedActivity

@CapacitorPlugin(name = "ActivityRecognition")
class ActivityRecognitionPlugin : Plugin() {

    private val ACTION = "com.teomewhy.academia.ACTIVITY_DETECTED"
    private var pendingIntent: PendingIntent? = null
    private var receiver: BroadcastReceiver? = null

    @PluginMethod
    fun start(call: PluginCall) {
        try {
            val ctx = context.applicationContext
            val intent = Intent(ctx, ActivityRecognitionReceiver::class.java).setAction(ACTION)
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            pendingIntent = PendingIntent.getBroadcast(ctx, 0, intent, flags)

            // 30s entre detecções
            val intervalMs = 30_000L
            ActivityRecognition.getClient(ctx)
                .requestActivityUpdates(intervalMs, pendingIntent!!)
                .addOnSuccessListener {
                    registerReceiver()
                    call.resolve(JSObject().put("ok", true))
                }
                .addOnFailureListener { e ->
                    call.reject("Falha ao iniciar Activity Recognition: ${e.message}", e)
                }
        } catch (e: Exception) {
            call.reject("Erro: ${e.message}", e)
        }
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        try {
            pendingIntent?.let { pi ->
                ActivityRecognition.getClient(context.applicationContext)
                    .removeActivityUpdates(pi)
            }
            unregisterReceiver()
            pendingIntent = null
            call.resolve(JSObject().put("ok", true))
        } catch (e: Exception) {
            call.reject("Erro ao parar: ${e.message}", e)
        }
    }

    private fun registerReceiver() {
        if (receiver != null) return
        receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context?, intent: Intent?) {
                if (intent == null) return
                if (!ActivityRecognitionResult.hasResult(intent)) return
                val result = ActivityRecognitionResult.extractResult(intent) ?: return
                val most = result.mostProbableActivity
                val data = JSObject().apply {
                    put("type", activityTypeName(most.type))
                    put("typeCode", most.type)
                    put("confidence", most.confidence)
                    put("timestamp", System.currentTimeMillis())
                }
                notifyListeners("activity", data)
            }
        }
        val filter = IntentFilter(ACTION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(receiver, filter)
        }
    }

    private fun unregisterReceiver() {
        receiver?.let {
            try { context.unregisterReceiver(it) } catch (_: Exception) {}
        }
        receiver = null
    }

    private fun activityTypeName(type: Int): String = when (type) {
        DetectedActivity.IN_VEHICLE -> "in_vehicle"
        DetectedActivity.ON_BICYCLE -> "on_bicycle"
        DetectedActivity.ON_FOOT -> "on_foot"
        DetectedActivity.RUNNING -> "running"
        DetectedActivity.STILL -> "still"
        DetectedActivity.TILTING -> "tilting"
        DetectedActivity.WALKING -> "walking"
        DetectedActivity.UNKNOWN -> "unknown"
        else -> "unknown"
    }
}

class ActivityRecognitionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val broadcast = Intent("com.teomewhy.academia.ACTIVITY_DETECTED")
        broadcast.putExtras(intent)
        broadcast.setPackage(context.packageName)
        context.sendBroadcast(broadcast)
    }
}
