package com.paragon.app.ui.panel

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.paragon.app.ui.theme.Platinum

/**
 * Juegos del muro de «Entrar» (9 nov 2026, propuesta A): carátulas reales de
 * la tienda de Steam (`library_600x900`), de juegos conocidos de todas las
 * plataformas. Si una no carga (sin red, o Steam la mueve), queda el
 * degradado de debajo y el muro sigue viéndose entero.
 */
private val JUEGOS_MURO = listOf(
    1245620, // Elden Ring
    1593500, // God of War
    1145360, // Hades
    1174180, // Red Dead Redemption 2
    367520, // Hollow Knight
    1817070, // Marvel's Spider-Man Remastered
    1086940, // Baldur's Gate 3
    814380, // Sekiro
    1091500, // Cyberpunk 2077
    1151640, // Horizon Zero Dawn
    504230, // Celeste
    292030, // The Witcher 3
    1190460, // Death Stranding
    1687950, // Persona 5 Royal
    374320, // Dark Souls III
    413150, // Stardew Valley
    2050650, // Resident Evil 4
    582010, // Monster Hunter: World
    1649240, // Returnal
    1426210, // It Takes Two
    990080, // Hogwarts Legacy
)

private fun caratula(appId: Int) = "https://cdn.cloudflare.steamstatic.com/steam/apps/$appId/library_600x900.jpg"

/** Colores de relleno mientras carga (o si no carga) cada carátula. */
private val RELLENOS = listOf(
    Color(0xFF3A2F1D) to Color(0xFFB8913F), Color(0xFF3B0D0D) to Color(0xFFE2533E),
    Color(0xFF0D1A2B) to Color(0xFF5B7FA8), Color(0xFF2B1240) to Color(0xFFD16BA5),
    Color(0xFF13361F) to Color(0xFF7FC46A), Color(0xFF151320) to Color(0xFF6C6390),
)

private const val COLUMNAS = 4
private const val POR_COLUMNA = 6

/**
 * Mosaico inclinado de carátulas que se desliza despacio en bucle: columnas
 * alternas en sentidos contrarios, como un escaparate. Se dibuja más grande
 * que su hueco (por el giro) y se recorta a él.
 */
@Composable
fun MuroCaratulas(modifier: Modifier = Modifier) {
    val bucle = rememberInfiniteTransition(label = "muro")
    val avance by bucle.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(durationMillis = 70_000, easing = LinearEasing), RepeatMode.Restart),
        label = "avance",
    )
    BoxWithConstraints(modifier.clipToBounds(), contentAlignment = Alignment.Center) {
        val hueco = 10.dp
        val ancho = maxWidth * 1.45f
        val alto = maxHeight * 1.45f
        val anchoCarta = (ancho - hueco * (COLUMNAS - 1)) / COLUMNAS
        val altoCiclo = (anchoCarta * 1.5f + hueco) * POR_COLUMNA
        val cicloPx = with(LocalDensity.current) { altoCiclo.toPx() }

        Row(
            Modifier.requiredSize(ancho, alto).graphicsLayer { rotationZ = -12f },
            horizontalArrangement = Arrangement.spacedBy(hueco),
        ) {
            repeat(COLUMNAS) { c ->
                // Cada columna con sus juegos y su desfase; las pares bajan y las impares suben.
                val juegos = List(POR_COLUMNA) { i -> JUEGOS_MURO[(c * POR_COLUMNA + i * 3 + c) % JUEGOS_MURO.size] }
                val sentido = if (c % 2 == 0) avance else 1f - avance
                val desfase = ((sentido + c * 0.21f) % 1f) * cicloPx
                Box(Modifier.weight(1f).fillMaxHeight()) {
                    Column(
                        Modifier
                            .wrapContentHeight(align = Alignment.Top, unbounded = true)
                            .offset { IntOffset(0, -desfase.toInt()) },
                        verticalArrangement = Arrangement.spacedBy(hueco),
                    ) {
                        // Dos vueltas seguidas: al acabar el ciclo, la segunda está justo donde empezó la primera.
                        (juegos + juegos + juegos.take(2)).forEachIndexed { i, appId ->
                            Caratula(appId, indice = c * 7 + i, platino = (i + c) % 4 == 1)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Caratula(appId: Int, indice: Int, platino: Boolean) {
    val (oscuro, claro) = RELLENOS[indice % RELLENOS.size]
    Box(
        Modifier
            .fillMaxWidth()
            .aspectRatio(2f / 3f)
            .clip(RoundedCornerShape(12.dp))
            .background(Brush.linearGradient(listOf(claro, oscuro))),
    ) {
        AsyncImage(
            model = caratula(appId),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        if (platino) {
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .padding(7.dp)
                    .shadow(8.dp, CircleShape, ambientColor = Platinum, spotColor = Platinum)
                    .size(16.dp)
                    .background(Platinum, CircleShape),
            )
        }
    }
}
