package com.paragon.app.util

import platform.Foundation.NSDate
import platform.Foundation.NSDateFormatter
import platform.Foundation.NSDateFormatterLongStyle
import platform.Foundation.NSDateFormatterMediumStyle
import platform.Foundation.NSDateFormatterNoStyle
import platform.Foundation.NSLocale
import platform.Foundation.NSNumber
import platform.Foundation.NSNumberFormatter
import platform.Foundation.NSNumberFormatterDecimalStyle
import platform.Foundation.dateWithTimeIntervalSince1970

private fun fecha(millis: Long) = NSDate.dateWithTimeIntervalSince1970(millis / 1000.0)

actual fun fechaConPatron(millis: Long, esqueleto: String, idioma: String): String {
    val f = NSDateFormatter()
    f.locale = NSLocale(localeIdentifier = idioma)
    f.setLocalizedDateFormatFromTemplate(esqueleto)
    return f.stringFromDate(fecha(millis))
}

actual fun fechaConEstilo(millis: Long, estilo: EstiloFecha, idioma: String): String {
    val f = NSDateFormatter()
    f.locale = NSLocale(localeIdentifier = idioma)
    f.dateStyle = if (estilo == EstiloFecha.LARGA) NSDateFormatterLongStyle else NSDateFormatterMediumStyle
    f.timeStyle = NSDateFormatterNoStyle
    return f.stringFromDate(fecha(millis))
}

actual fun numeroLocal(valor: Double, decimales: Int, idioma: String): String {
    val f = NSNumberFormatter()
    f.locale = NSLocale(localeIdentifier = idioma)
    f.numberStyle = NSNumberFormatterDecimalStyle
    f.minimumFractionDigits = decimales.toULong()
    f.maximumFractionDigits = decimales.toULong()
    return f.stringFromNumber(NSNumber(double = valor)) ?: valor.toString()
}
