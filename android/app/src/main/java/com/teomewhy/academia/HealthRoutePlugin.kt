package com.teomewhy.academia

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseRouteResult
import androidx.health.connect.client.records.ExerciseSessionRecord
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@CapacitorPlugin(name = "HealthRoute")
class HealthRoutePlugin : Plugin() {

    @PluginMethod
    fun readExerciseRoute(call: PluginCall) {
        val sessionId = call.getString("sessionId")

        if (sessionId.isNullOrEmpty()) {
            call.reject("sessionId is required")
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val context: Context = activity.applicationContext

                val status = HealthConnectClient.getSdkStatus(context)
                if (status != HealthConnectClient.SDK_AVAILABLE) {
                    withContext(Dispatchers.Main) {
                        val resp = JSObject()
                        resp.put("route", JSArray())
                        resp.put("error", "Health Connect SDK not available: status=$status")
                        call.resolve(resp)
                    }
                    return@launch
                }

                val client = HealthConnectClient.getOrCreate(context)

                val record = try {
                    client.readRecord(ExerciseSessionRecord::class, sessionId).record
                } catch (e: Exception) {
                    null
                }

                if (record == null) {
                    withContext(Dispatchers.Main) {
                        call.resolve(JSObject().put("route", JSArray()))
                    }
                    return@launch
                }

                val routeResult = record.exerciseRouteResult
                val response = JSObject()

                when (routeResult) {
                    is ExerciseRouteResult.Data -> {
                        val points = JSArray()
                        for (location in routeResult.exerciseRoute.route) {
                            val point = JSObject()
                            point.put("lat", location.latitude)
                            point.put("lng", location.longitude)
                            location.altitude?.let { point.put("altitude", it.inMeters) }
                            point.put("timestamp", location.time.toString())
                            points.put(point)
                        }
                        response.put("route", points)
                    }
                    is ExerciseRouteResult.ConsentRequired -> {
                        response.put("consentRequired", true)
                        response.put("route", JSArray())
                    }
                    is ExerciseRouteResult.NoData -> {
                        response.put("route", JSArray())
                    }
                }

                withContext(Dispatchers.Main) {
                    call.resolve(response)
                }
            } catch (e: SecurityException) {
                withContext(Dispatchers.Main) {
                    val resp = JSObject()
                    resp.put("consentRequired", true)
                    resp.put("route", JSArray())
                    call.resolve(resp)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    val resp = JSObject()
                    resp.put("route", JSArray())
                    resp.put("error", e.message ?: "unknown error")
                    call.resolve(resp)
                }
            }
        }
    }

    @PluginMethod
    fun requestRoutePermission(call: PluginCall) {
        try {
            val ctx = context.applicationContext
            val permissions = setOf(
                HealthPermission.getReadPermission(ExerciseSessionRecord::class),
                "android.permission.health.READ_EXERCISE_ROUTES"
            )
            val contract = PermissionController.createRequestPermissionResultContract()
            val intent = contract.createIntent(ctx, permissions)
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            ctx.startActivity(intent)
            call.resolve(JSObject().put("ok", true))
        } catch (e: Exception) {
            call.reject("Falha ao solicitar permissão de rotas: ${e.message}", e)
        }
    }

    @PluginMethod
    fun getGrantedPermissions(call: PluginCall) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val ctx = context.applicationContext
                val client = HealthConnectClient.getOrCreate(ctx)
                val granted = client.permissionController.getGrantedPermissions()
                val arr = JSArray()
                granted.forEach { arr.put(it) }
                val resp = JSObject()
                resp.put("permissions", arr)
                resp.put("hasRoutes", granted.contains("android.permission.health.READ_EXERCISE_ROUTES"))
                withContext(Dispatchers.Main) { call.resolve(resp) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    call.reject("Erro: ${e.message}", e)
                }
            }
        }
    }
}
