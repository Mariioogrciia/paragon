package com.paragon.app.ui.common

import androidx.compose.ui.graphics.Color
import coil3.Image
import coil3.toBitmap
import kotlin.math.max
import kotlin.math.min

/**
 * Color "aura" de una carátula en iOS (en Android lo hace Palette): se
 * muestrean ~400 píxeles y se queda el más vivo (saturación × brillo), como
 * el `vibrantSwatch` de Palette; si todo es gris, el promedio.
 */
actual fun extractAuraColor(image: Image): Color? = try {
    val bitmap = image.toBitmap()
    val paso = max(1, min(bitmap.width, bitmap.height) / 20)
    var mejor: Color? = null
    var mejorPeso = 0f
    var r = 0f; var g = 0f; var b = 0f; var n = 0
    for (y in 0 until bitmap.height step paso) {
        for (x in 0 until bitmap.width step paso) {
            val argb = bitmap.getColor(x, y)
            val c = Color(argb)
            if (c.alpha < 0.5f) continue
            r += c.red; g += c.green; b += c.blue; n++
            val maximo = maxOf(c.red, c.green, c.blue)
            val minimo = minOf(c.red, c.green, c.blue)
            val saturacion = if (maximo == 0f) 0f else (maximo - minimo) / maximo
            // Ni casi negro ni casi blanco: lo que daría un fondo con carácter.
            val peso = if (maximo < 0.25f || (saturacion < 0.15f && maximo > 0.9f)) 0f else saturacion * maximo
            if (peso > mejorPeso) { mejorPeso = peso; mejor = c }
        }
    }
    when {
        mejorPeso > 0.2f -> mejor
        n > 0 -> Color(r / n, g / n, b / n)
        else -> null
    }
} catch (e: Exception) {
    null
}
