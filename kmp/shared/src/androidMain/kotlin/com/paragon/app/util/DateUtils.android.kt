package com.paragon.app.util

import java.text.DateFormat
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

actual fun fechaConPatron(millis: Long, esqueleto: String, idioma: String): String {
    val locale = Locale.forLanguageTag(idioma)
    val patron = android.text.format.DateFormat.getBestDateTimePattern(locale, esqueleto)
    return SimpleDateFormat(patron, locale).format(Date(millis))
}

actual fun fechaConEstilo(millis: Long, estilo: EstiloFecha, idioma: String): String {
    val estiloJava = if (estilo == EstiloFecha.LARGA) DateFormat.LONG else DateFormat.MEDIUM
    return DateFormat.getDateInstance(estiloJava, Locale.forLanguageTag(idioma)).format(Date(millis))
}

actual fun numeroLocal(valor: Double, decimales: Int, idioma: String): String =
    NumberFormat.getNumberInstance(Locale.forLanguageTag(idioma)).apply {
        minimumFractionDigits = decimales
        maximumFractionDigits = decimales
    }.format(valor)
