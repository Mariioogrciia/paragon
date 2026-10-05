@file:OptIn(ExperimentalTime::class)

package com.paragon.app.data

import kotlin.time.Clock
import kotlin.time.ExperimentalTime
import kotlin.time.Instant

// Fechas en común (Android e iOS), en lugar de System.currentTimeMillis y
// SimpleDateFormat. Las fechas de la API son ISO-8601 en UTC, como
// "2026-10-05T10:12:33.123Z" (Date.toISOString() del servidor).

internal fun ahoraMillis(): Long = Clock.System.now().toEpochMilliseconds()

/** Milisegundos de una fecha ISO-8601, o null si no se entiende. */
internal fun isoAMillis(iso: String?): Long? =
    if (iso.isNullOrBlank()) null else try {
        Instant.parse(iso).toEpochMilliseconds()
    } catch (e: Exception) {
        null
    }

/**
 * La fecha en el formato exacto del servidor (siempre 3 decimales y Z), para
 * poder comparar como texto con las que llegan de la API.
 */
internal fun millisAIso(millis: Long): String {
    val s = Instant.fromEpochMilliseconds(millis).toString() // "...:33Z" o "...:33.1Z"
    val sinZ = s.removeSuffix("Z")
    val punto = sinZ.indexOf('.')
    val decimales = if (punto < 0) "000" else sinZ.substring(punto + 1).padEnd(3, '0').take(3)
    val base = if (punto < 0) sinZ else sinZ.substring(0, punto)
    return "$base.${decimales}Z"
}
