package com.paragon.app.util

import androidx.compose.runtime.Composable

// Umbral en "g" (aceleración / gravedad) — 2.7g es un gesto de sacudida
// deliberado, no un bache al andar con el móvil en el bolsillo (~1.2-1.5g).
internal const val UMBRAL_G = 2.7f
internal const val COOLDOWN_MS = 1500L

/**
 * "Agitar para jugar" (idea de Antigravity): agitar el móvil en la
 * Biblioteca elige un juego al azar de los que están al 0% — para cuando
 * hay demasiado backlog y no sabes por cuál empezar. Acelerómetro directo:
 * SensorManager en Android, CoreMotion en iOS; magnitud del vector de
 * aceleración en g, con una espera para no disparar 10 veces seguidas del
 * mismo gesto.
 */
@Composable
expect fun rememberShakeListener(enabled: Boolean, onShake: () -> Unit)
