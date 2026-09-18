package com.paragon.app.ui.common

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path

/**
 * El símbolo de Paragon — antes era una `P` mayúscula dentro de un
 * cuadrado con degradado, que no dice nada de la app por sí sola (podría
 * ser el icono de cualquier cosa que empiece por P). Una gema facetada con
 * una flecha ascendente dentro: rareza/valor (la gema, mismo lenguaje que
 * "rareza" de los propios trofeos) + progreso/subir de rango (la flecha) —
 * sin depender de la inicial. Vector dibujado a mano (`Path`, no un
 * recurso), así que escala nítido en cualquier tamaño sin generar un
 * drawable aparte.
 */
@Composable
fun ParagonMark(modifier: Modifier = Modifier, colors: List<Color> = listOf(Color(0xFF1687FF), Color(0xFF8B5CF6))) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height

        // Gema facetada: rombo con las dos puntas laterales recogidas hacia
        // dentro (facetas), no un diamante liso — se nota más a tamaños
        // pequeños que un rombo perfecto, que a 22-24dp se lee como un
        // cuadrado girado sin más.
        val gem = Path().apply {
            moveTo(w * 0.5f, 0f)
            lineTo(w * 0.92f, h * 0.36f)
            lineTo(w * 0.74f, h * 0.4f)
            lineTo(w * 0.5f, h)
            lineTo(w * 0.26f, h * 0.4f)
            lineTo(w * 0.08f, h * 0.36f)
            close()
        }
        drawPath(
            path = gem,
            brush = Brush.linearGradient(
                colors = colors,
                start = Offset(0f, 0f),
                end = Offset(w, h),
            ),
        )

        // Flecha ascendente en el centro, en blanco translúcido — el
        // "progreso" dentro de la propia gema, no un icono aparte pegado
        // encima.
        val arrow = Path().apply {
            moveTo(w * 0.5f, h * 0.3f)
            lineTo(w * 0.68f, h * 0.52f)
            lineTo(w * 0.585f, h * 0.52f)
            lineTo(w * 0.585f, h * 0.74f)
            lineTo(w * 0.415f, h * 0.74f)
            lineTo(w * 0.415f, h * 0.52f)
            lineTo(w * 0.32f, h * 0.52f)
            close()
        }
        drawPath(path = arrow, color = Color.White.copy(alpha = 0.95f))
    }
}
