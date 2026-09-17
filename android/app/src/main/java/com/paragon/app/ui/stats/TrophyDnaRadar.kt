package com.paragon.app.ui.stats

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.TrophyDnaEje
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Muted
import kotlin.math.cos
import kotlin.math.sin

/**
 * Radar/spider chart táctil del ADN de trofeos (idea #32 del brainstorm de
 * v1.0) — "el gráfico radar... pero lo giras con el dedo". La rotación es
 * 2D pura (ángulo de cada eje + desplazamiento por arrastre horizontal), no
 * una perspectiva 3D real: eso habría necesitado una librería de gráficos
 * 3D entera para un solo gráfico, desproporcionado para lo que pide la
 * idea — girar con el dedo es la parte que de verdad importa.
 *
 * Los textos de las etiquetas se calculan con la MISMA fórmula de ángulo
 * que el polígono (no se rota el `Canvas` entero con una matriz) — así el
 * texto siempre queda derecho y legible aunque el usuario gire el radar,
 * en vez de leerse "de lado" a mitad de giro.
 */
@Composable
fun TrophyDnaRadar(ejes: List<TrophyDnaEje>, modifier: Modifier = Modifier) {
    // Con 1-2 géneros jugados un radar no tiene forma reconocible (un
    // triángulo degenerado o una línea) — quien llama se queda con el
    // listado de barras de siempre en ese caso (ver StatsScreen.kt).
    if (ejes.size < 3) return

    var rotationDegrees by remember { mutableFloatStateOf(0f) }
    val textMeasurer = rememberTextMeasurer()

    val accentColor = Accent
    val mutedColor = Muted
    val gridColor = Border

    // El gesto consume CUALQUIER arrastre dentro del radar (no solo
    // horizontal) para poder girarlo, así que mientras el dedo esté encima
    // del gráfico la pantalla de Estadísticas no hace scroll — el usuario
    // tiene que arrastrar fuera del radar para seguir bajando. Mismo
    // compromiso que cualquier gráfico interactivo dentro de una lista.
    Canvas(
        modifier = modifier
            .aspectRatio(1f)
            .pointerInput(Unit) {
                detectDragGestures { change, dragAmount ->
                    change.consume()
                    // Sensibilidad ajustada a mano: un arrastre de punta a
                    // punta de un móvil normal da más o menos una vuelta
                    // completa, ni muy brusco ni demasiado lento.
                    rotationDegrees += dragAmount.x * 0.5f
                }
            },
    ) {
        val n = ejes.size
        val center = Offset(size.width / 2f, size.height / 2f)
        val labelMargin = 28.dp.toPx()
        val maxRadius = (size.minDimension / 2f) - labelMargin
        val startAngleDeg = -90.0 + rotationDegrees
        val stepDeg = 360.0 / n

        fun pointAt(index: Int, fraction: Float): Offset {
            val angleRad = Math.toRadians(startAngleDeg + stepDeg * index)
            return Offset(
                x = center.x + (maxRadius * fraction * cos(angleRad)).toFloat(),
                y = center.y + (maxRadius * fraction * sin(angleRad)).toFloat(),
            )
        }

        // Anillos de fondo (25/50/75/100%) — dan referencia de escala.
        listOf(0.25f, 0.5f, 0.75f, 1f).forEach { fraction ->
            val ring = Path()
            for (i in 0 until n) {
                val p = pointAt(i, fraction)
                if (i == 0) ring.moveTo(p.x, p.y) else ring.lineTo(p.x, p.y)
            }
            ring.close()
            drawPath(ring, color = gridColor, style = Stroke(width = 1.dp.toPx()))
        }

        // Ejes: una línea del centro a cada punta.
        for (i in 0 until n) {
            val p = pointAt(i, 1f)
            drawLine(color = gridColor, start = center, end = p, strokeWidth = 1.dp.toPx())
        }

        // Polígono de datos real.
        val dataPath = Path()
        ejes.forEachIndexed { i, eje ->
            val p = pointAt(i, eje.valor / 100f)
            if (i == 0) dataPath.moveTo(p.x, p.y) else dataPath.lineTo(p.x, p.y)
        }
        dataPath.close()
        drawPath(dataPath, color = accentColor.copy(alpha = 0.22f))
        drawPath(dataPath, color = accentColor, style = Stroke(width = 2.5.dp.toPx()))

        ejes.forEachIndexed { i, eje ->
            val p = pointAt(i, eje.valor / 100f)
            drawCircle(color = accentColor, radius = 4.dp.toPx(), center = p)
        }

        // Etiquetas, siempre derechas — ver el comentario de cabecera.
        ejes.forEachIndexed { i, eje ->
            val p = pointAt(i, 1.2f)
            val measured = textMeasurer.measure(
                text = eje.label,
                style = TextStyle(fontSize = 11.sp, color = mutedColor, fontWeight = FontWeight.SemiBold),
            )
            drawText(
                textLayoutResult = measured,
                topLeft = Offset(p.x - measured.size.width / 2f, p.y - measured.size.height / 2f),
            )
        }
    }
}
