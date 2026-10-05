package com.paragon.app.util

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import com.paragon.app.data.ahoraMillis
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.useContents
import platform.CoreMotion.CMMotionManager
import platform.Foundation.NSOperationQueue
import kotlin.math.sqrt

// CoreMotion da la aceleración ya en g (1.0 = gravedad), como el cálculo de Android.
@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun rememberShakeListener(enabled: Boolean, onShake: () -> Unit) {
    val currentOnShake by rememberUpdatedState(onShake)
    DisposableEffect(enabled) {
        val motion = CMMotionManager()
        if (!enabled || !motion.accelerometerAvailable) return@DisposableEffect onDispose {}
        var lastShakeAt = 0L
        motion.accelerometerUpdateInterval = 1.0 / 30.0
        motion.startAccelerometerUpdatesToQueue(NSOperationQueue.mainQueue) { datos, _ ->
            val magnitud = datos?.acceleration?.useContents { sqrt(x * x + y * y + z * z) } ?: return@startAccelerometerUpdatesToQueue
            if (magnitud > UMBRAL_G) {
                val ahora = ahoraMillis()
                if (ahora - lastShakeAt > COOLDOWN_MS) {
                    lastShakeAt = ahora
                    currentOnShake()
                }
            }
        }
        onDispose { motion.stopAccelerometerUpdates() }
    }
}
