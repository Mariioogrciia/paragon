package com.paragon.app.util

import com.paragon.app.data.ahoraMillis
import com.paragon.app.data.isoAMillis
import com.paragon.shared.i18n.Textos
import kotlinx.datetime.TimeZone
import kotlinx.datetime.number
import kotlinx.datetime.todayIn
import kotlin.time.Clock
import kotlin.time.ExperimentalTime

// Fechas y números en el idioma de la app (Textos.idioma, el de Ajustes →
// Idioma o el del teléfono). Lo único de cada plataforma es dar formato
// (SimpleDateFormat/NumberFormat en Android, NSDateFormatter/NSNumberFormatter
// en iOS); el resto es común.

enum class EstiloFecha { MEDIA, LARGA }

/** Fecha con el patrón "más natural" del idioma para ese esqueleto (p. ej. "EEEEdMMMM" → "jueves, 24 de octubre"). */
expect fun fechaConPatron(millis: Long, esqueleto: String, idioma: String = Textos.idioma.codigo): String

/** Fecha con el estilo estándar del idioma ("23 jun 2026" / "23 de junio de 2026"). */
expect fun fechaConEstilo(millis: Long, estilo: EstiloFecha, idioma: String = Textos.idioma.codigo): String

/** Número con los separadores del idioma ("4.312", "1,5"). */
expect fun numeroLocal(valor: Double, decimales: Int, idioma: String = Textos.idioma.codigo): String

/** 4312 → "4.312" / "4,312" según el idioma. */
fun cifra(n: Int): String = numeroLocal(n.toDouble(), 0)

fun formatDecimal(value: Double, decimals: Int): String = numeroLocal(value, decimals)

fun formatFechaCorta(iso: String): String = isoAMillis(iso)?.let { fechaConEstilo(it, EstiloFecha.MEDIA) } ?: iso

fun formatFechaLarga(iso: String): String = isoAMillis(iso)?.let { fechaConEstilo(it, EstiloFecha.LARGA) } ?: iso

/** "2026-10-05" (UTC) para agrupar por día. */
fun claveDia(millis: Long): String = com.paragon.app.data.millisAIso(millis).take(10)

private const val UN_DIA_MS = 86_400_000L

/** Días que faltan hasta `endsAt` (ISO), o null si ya pasó o no se entiende. */
fun diasHasta(endsAt: String?): Int? {
    val fin = isoAMillis(endsAt) ?: return null
    val dias = ((fin - ahoraMillis()) / UN_DIA_MS).toInt()
    return if (dias >= 0) dias else null
}

/** Días que quedan del mes actual (hoy no cuenta), en la zona horaria del teléfono. */
@OptIn(ExperimentalTime::class)
fun diasRestantesMes(): Int {
    val hoy = Clock.System.todayIn(TimeZone.currentSystemDefault())
    val bisiesto = hoy.year % 4 == 0 && (hoy.year % 100 != 0 || hoy.year % 400 == 0)
    val diasMes = when (hoy.month.number) {
        2 -> if (bisiesto) 29 else 28
        4, 6, 9, 11 -> 30
        else -> 31
    }
    return diasMes - hoy.day
}
