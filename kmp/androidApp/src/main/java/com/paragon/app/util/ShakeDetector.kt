package com.paragon.app.util

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import kotlin.math.sqrt

// Umbral en "g" (aceleración / gravedad) — 2.7g es un gesto de sacudida
// deliberado, no un bache al andar con el móvil en el bolsillo (~1.2-1.5g).
private const val UMBRAL_G = 2.7f
private const val COOLDOWN_MS = 1500L

/**
 * "Agitar para jugar" (idea de Antigravity): agitar el móvil en la
 * Biblioteca elige un juego al azar de los que están al 0% — para cuando
 * hay demasiado backlog y no sabes por cuál empezar. Se apoya en el
 * acelerómetro directo (no `SensorManager.SENSOR_DELAY_UI` con un
 * `ShakeDetector` de terceros) porque es la única señal que hace falta:
 * magnitud del vector de aceleración menos la gravedad, con un cooldown
 * para no disparar 10 veces seguidas del mismo gesto.
 */
@Composable
fun rememberShakeListener(enabled: Boolean, onShake: () -> Unit) {
    val context = LocalContext.current
    val currentOnShake by rememberUpdatedState(onShake)

    DisposableEffect(context, enabled) {
        if (!enabled) return@DisposableEffect onDispose {}

        val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        val accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        if (sensorManager == null || accelerometer == null) return@DisposableEffect onDispose {}

        var lastShakeAt = 0L
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                val gX = event.values[0] / SensorManager.GRAVITY_EARTH
                val gY = event.values[1] / SensorManager.GRAVITY_EARTH
                val gZ = event.values[2] / SensorManager.GRAVITY_EARTH
                val magnitude = sqrt(gX * gX + gY * gY + gZ * gZ)

                if (magnitude > UMBRAL_G) {
                    val now = System.currentTimeMillis()
                    if (now - lastShakeAt > COOLDOWN_MS) {
                        lastShakeAt = now
                        currentOnShake()
                    }
                }
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
        }

        sensorManager.registerListener(listener, accelerometer, SensorManager.SENSOR_DELAY_UI)
        onDispose { sensorManager.unregisterListener(listener) }
    }
}
