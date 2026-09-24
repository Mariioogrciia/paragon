package com.paragon.app.ui.wrap

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import coil3.compose.AsyncImage
import com.paragon.app.data.WrapData
import com.paragon.app.data.WrapRepository
import com.paragon.app.data.WrapResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

private const val DURACION_MS = 6000

private val MESES = mapOf(
    "01" to "enero", "02" to "febrero", "03" to "marzo", "04" to "abril",
    "05" to "mayo", "06" to "junio", "07" to "julio", "08" to "agosto",
    "09" to "septiembre", "10" to "octubre", "11" to "noviembre", "12" to "diciembre",
)

private fun nombreMes(clave: String): String {
    val mes = clave.split("-").getOrNull(1) ?: return clave
    return (MESES[mes] ?: mes).replaceFirstChar { it.uppercase() }
}

private data class Slide(val key: String, val background: Brush, val content: @Composable () -> Unit)

/**
 * Paragon Wrap en formato Stories: mismo recorrido que WrapStories.tsx en
 * la web — avanza sola cada 6s (con barras de progreso arriba), se pausa
 * mientras se mantiene pulsado, y se controla tocando el tercio izquierdo
 * (atrás) o los dos tercios derechos (adelante). Ningún dato nuevo: son
 * los mismos números de siempre, solo que a pantalla completa y de uno en
 * uno.
 */
@Composable
fun WrapStoriesScreen(tokenStore: TokenStore, onClose: () -> Unit) {
    val repository = remember(tokenStore) { WrapRepository(tokenStore) }
    var result by remember { mutableStateOf<WrapResult?>(null) }
    val retryCounter = remember { mutableIntStateOf(0) }

    LaunchedEffect(retryCounter.value) { result = repository.getWrap() }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.92f))) {
        when (val current = result) {
            null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Accent)
            }
            is WrapResult.Error -> Column(
                modifier = Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(text = current.message, color = Foreground, fontSize = 14.sp)
                TextButton(onClick = { retryCounter.value += 1 }, modifier = Modifier.padding(top = 12.dp)) {
                    Text("Reintentar", color = Accent, fontWeight = FontWeight.SemiBold)
                }
            }
            is WrapResult.Ok -> WrapStoriesContent(data = current.data)
        }

        IconButton(onClick = onClose, modifier = Modifier.align(Alignment.TopEnd).padding(top = 32.dp, end = 12.dp)) {
            Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color.White)
        }
    }
}

@Composable
private fun WrapStoriesContent(data: WrapData) {
    val slides = remember(data) { buildSlides(data) }
    var index by remember { mutableIntStateOf(0) }
    var progress by remember { mutableFloatStateOf(0f) }
    var paused by remember { mutableStateOf(false) }

    fun next() {
        if (index >= slides.size - 1) return
        index += 1
    }
    fun prev() {
        index = (index - 1).coerceAtLeast(0)
    }

    LaunchedEffect(index) {
        progress = 0f
        val inicio = System.currentTimeMillis()
        while (isActive) {
            if (!paused) {
                val transcurrido = System.currentTimeMillis() - inicio
                progress = (transcurrido / DURACION_MS.toFloat()).coerceAtMost(1f)
                if (progress >= 1f) {
                    if (index < slides.size - 1) index += 1
                    break
                }
            }
            delay(16)
        }
    }

    if (slides.isEmpty()) return
    val slide = slides[index]

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .background(slide.background, RoundedCornerShape(24.dp))
            .pointerInput(slides.size) {
                detectTapGestures(
                    onPress = {
                        paused = true
                        tryAwaitRelease()
                        paused = false
                    },
                    onTap = { offset ->
                        if (offset.x < size.width * 0.35f) prev() else next()
                    },
                )
            },
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(top = 16.dp, start = 12.dp, end = 12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                slides.forEachIndexed { i, s ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(3.dp)
                            .background(Color.White.copy(alpha = 0.25f), RoundedCornerShape(2.dp)),
                    ) {
                        val frac = if (i < index) 1f else if (i == index) progress else 0f
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(frac)
                                .fillMaxHeight()
                                .background(Color.White, RoundedCornerShape(2.dp)),
                        )
                    }
                }
            }
        }

        Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.CenterStart) {
            slide.content()
        }
    }
}

@Composable
private fun EtiquetaSlide(texto: String, color: Color) {
    Text(text = texto, color = color, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.6.sp)
}

private fun buildSlides(data: WrapData): List<Slide> {
    if (data.esteAnio == 0) {
        return listOf(
            Slide(
                key = "vacio",
                background = Brush.linearGradient(listOf(Color(0xFF1C2433), Color(0xFF10141C))),
                content = {
                    Column {
                        Text(text = "✨", fontSize = 48.sp)
                        Text(
                            text = "${data.playerName}, todavía no hay Wrap que contar",
                            color = Color.White,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(top = 20.dp),
                        )
                        Text(
                            text = "En cuanto consigas trofeos con fecha este año, aparecerán aquí.",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 13.sp,
                            modifier = Modifier.padding(top = 12.dp),
                        )
                    }
                },
            ),
        )
    }

    val slides = mutableListOf(
        Slide(
            key = "portada",
            background = Brush.linearGradient(listOf(Color(0xFF5A3410), Color(0xFF3A1F08), Color(0xFF241305))),
            content = {
                Column {
                    EtiquetaSlide("PARAGON WRAP", Color(0xFFFCD34D))
                    Text(
                        text = "¡Hola, ${data.playerName}!",
                        color = Color.White,
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 12.dp),
                    )
                    Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.padding(top = 28.dp)) {
                        Text(text = data.esteAnio.toString(), color = Color.White, fontSize = 56.sp, fontWeight = FontWeight.Bold)
                        Text(
                            text = "  trofeos\n  conseguidos",
                            color = Color.White.copy(alpha = 0.8f),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(bottom = 6.dp),
                        )
                    }
                }
            },
        ),
        Slide(
            key = "genero",
            background = Brush.linearGradient(listOf(Color(0xFF3B1D6E), Color(0xFF1C1040), Color(0xFF120A26))),
            content = {
                Column {
                    EtiquetaSlide("GÉNERO MÁS JUGADO", Color(0xFFC4B5FD))
                    Text(text = "🎮", fontSize = 44.sp, modifier = Modifier.padding(top = 20.dp))
                    Text(
                        text = data.topGenre.name,
                        color = Color.White,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 16.dp),
                    )
                    Text(
                        text = "${data.topGenre.count} títulos de este género",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 10.dp),
                    )
                }
            },
        ),
    )

    val topGame = data.topGame
    if (topGame != null) {
        slides.add(
            Slide(
                key = "juego",
                background = Brush.linearGradient(listOf(Color(0xFF1B2838), Color(0xFF0E141B))),
                content = {
                    Box(modifier = Modifier.fillMaxSize()) {
                        if (topGame.iconUrl != null) {
                            AsyncImage(
                                model = topGame.iconUrl,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize().blur(24.dp),
                                alpha = 0.35f,
                            )
                            Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.4f)))
                        }
                        Column(modifier = Modifier.align(Alignment.CenterStart)) {
                            EtiquetaSlide("JUEGO MÁS EXPRIMIDO", Color(0xFFA8CCFF))
                            Text(
                                text = topGame.title,
                                color = Color.White,
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(top = 16.dp),
                            )
                            Text(
                                text = if (topGame.horasTotal > 0) {
                                    "%.1fh jugadas".format(topGame.horasTotal)
                                } else {
                                    "${topGame.earnedTrophies} trofeos conseguidos"
                                },
                                color = Color.White.copy(alpha = 0.8f),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(top = 10.dp),
                            )
                        }
                    }
                },
            ),
        )
    }

    val mejorMes = data.mejorMes
    if (mejorMes != null && mejorMes.total > 0) {
        slides.add(
            Slide(
                key = "mejor-mes",
                background = Brush.linearGradient(listOf(Color(0xFF14202C), Color(0xFF0D131C))),
                content = {
                    Column {
                        EtiquetaSlide("TU MEJOR MES", Color(0xFF9FD4EC))
                        Text(
                            text = nombreMes(mejorMes.mes),
                            color = Color.White,
                            fontSize = 30.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(top = 20.dp),
                        )
                        Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.padding(top = 12.dp)) {
                            Text(text = mejorMes.total.toString(), color = Color(0xFF9FD4EC), fontSize = 44.sp, fontWeight = FontWeight.Bold)
                            Text(text = "  trofeos ese mes", color = Color.White.copy(alpha = 0.7f), fontSize = 13.sp, modifier = Modifier.padding(bottom = 6.dp))
                        }
                    }
                },
            ),
        )
    }

    if (data.rachas.mejor > 0) {
        slides.add(
            Slide(
                key = "racha",
                background = Brush.linearGradient(listOf(Color(0xFF0F3D2E), Color(0xFF0A2620), Color(0xFF061715))),
                content = {
                    Column {
                        EtiquetaSlide("RACHA", Color(0xFF6EE7B7))
                        Text(text = "🔥", fontSize = 44.sp, modifier = Modifier.padding(top = 20.dp))
                        Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.padding(top = 12.dp)) {
                            Text(text = data.rachas.mejor.toString(), color = Color.White, fontSize = 44.sp, fontWeight = FontWeight.Bold)
                            Text(
                                text = "  ${if (data.rachas.mejor == 1) "día seguido" else "días seguidos"}",
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 13.sp,
                                modifier = Modifier.padding(bottom = 6.dp),
                            )
                        }
                        Text(
                            text = "${data.rachas.diasActivos} días distintos con algún trofeo",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 13.sp,
                            modifier = Modifier.padding(top = 10.dp),
                        )
                    }
                },
            ),
        )
    }

    val percentil = data.percentil
    if (percentil != null) {
        slides.add(
            Slide(
                key = "percentil",
                background = Brush.linearGradient(listOf(Color(0xFF2C2438), Color(0xFF1A1522), Color(0xFF100D16))),
                content = {
                    Column {
                        EtiquetaSlide("CÓMO TE COMPARAS", Color(0xFFE2B53E))
                        Text(
                            text = "Top ${percentil.percentil}%",
                            color = Color.White,
                            fontSize = 38.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(top = 20.dp),
                        )
                        Text(
                            text = "Menos trofeos con fecha este año que tú tiene el ${100 - percentil.percentil}% de los ${percentil.totalUsuarios} usuarios reales de Paragon.",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 13.sp,
                            modifier = Modifier.padding(top = 12.dp),
                        )
                    }
                },
            ),
        )
    }

    slides.add(
        Slide(
            key = "cierre",
            background = Brush.linearGradient(listOf(Color(0xFF1C2433), Color(0xFF10141C))),
            content = {
                Column {
                    Text(text = "🏆", fontSize = 44.sp)
                    Text(
                        text = "Eso fue ${data.esteAnio} en Paragon",
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 20.dp),
                    )
                    Text(
                        text = "Repartidos en ${data.juegosEsteAnio} ${if (data.juegosEsteAnio == 1) "juego" else "juegos"} distintos. A por el año que viene.",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 12.dp),
                    )
                }
            },
        ),
    )

    return slides
}
