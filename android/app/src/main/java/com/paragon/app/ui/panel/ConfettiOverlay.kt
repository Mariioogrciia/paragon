package com.paragon.app.ui.panel

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Bronze
import com.paragon.app.ui.theme.Gold
import com.paragon.app.ui.theme.Platinum
import com.paragon.app.ui.theme.Silver
import kotlin.random.Random

private class Confeti(
    val startXFraction: Float,
    val delayFraction: Float,
    val driftFraction: Float,
    val rotationSpeed: Float,
    val sizePx: Float,
    val color: Color,
)

/**
 * Lluvia de "platinos" — easter egg de PanelScreen (5 toques seguidos en
 * PlatinumStatTile). Un `Canvas` con ~40 cuadrados cayendo en vez de una
 * librería de partículas: no hace falta más para un guiño de 2 segundos.
 */
@Composable
fun ConfettiOverlay(modifier: Modifier = Modifier) {
    val colores = remember { listOf(Platinum, Gold, Silver, Bronze, Accent) }
    val piezas = remember {
        List(40) { index ->
            Confeti(
                startXFraction = Random.nextFloat(),
                delayFraction = Random.nextFloat() * 0.3f,
                driftFraction = (Random.nextFloat() - 0.5f) * 0.3f,
                rotationSpeed = (Random.nextFloat() - 0.5f) * 720f,
                sizePx = 8f + Random.nextFloat() * 10f,
                color = colores[index % colores.size],
            )
        }
    }
    val progress = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        progress.animateTo(1f, animationSpec = tween(durationMillis = 2200, easing = LinearEasing))
    }

    Canvas(modifier = modifier.fillMaxSize()) {
        val t = progress.value
        piezas.forEach { pieza ->
            val local = ((t - pieza.delayFraction) / (1f - pieza.delayFraction)).coerceIn(0f, 1f)
            if (local <= 0f) return@forEach

            val y = local * (size.height + 80f) - 40f
            val x = pieza.startXFraction * size.width + pieza.driftFraction * size.width * local

            rotate(degrees = pieza.rotationSpeed * local, pivot = Offset(x, y)) {
                drawRect(
                    color = pieza.color.copy(alpha = (1f - local * 0.4f).coerceIn(0f, 1f)),
                    topLeft = Offset(x - pieza.sizePx / 2, y - pieza.sizePx / 2),
                    size = Size(pieza.sizePx, pieza.sizePx),
                )
            }
        }
    }
}
