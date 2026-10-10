package com.paragon.app.ui.panel

import com.paragon.shared.i18n.stringResource

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.DiaActividad
import com.paragon.app.data.RachaDetalle
import com.paragon.app.data.RachaDetalleResult
import com.paragon.app.data.RachaRepository
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

import com.paragon.app.util.animacionesReducidas

/**
 * Pantalla dedicada a la racha (pedido explícito del usuario: ni el resumen
 * del Panel ni la pantalla entera de Estadísticas, algo propio) — se abre
 * al tocar el icono de fuego de la cabecera. Contra GET /api/mobile/racha,
 * curado aparte de /stats para no cargar toda esa pantalla por un detalle.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RachaSheet(tokenStore: TokenStore, onDismiss: () -> Unit) {
    val repository = remember(tokenStore) { RachaRepository(tokenStore) }
    var result by remember { mutableStateOf<RachaDetalleResult?>(null) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(Unit) {
        result = repository.getRacha()
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = com.paragon.app.ui.theme.SurfaceSolida) {
        Box(modifier = Modifier.fillMaxWidth().verticalScroll(androidx.compose.foundation.rememberScrollState()).padding(horizontal = 24.dp, vertical = 8.dp).padding(bottom = 32.dp)) {
            when (val current = result) {
                null -> Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                is RachaDetalleResult.Error -> Text(text = current.message, color = Muted, fontSize = 14.sp)
                is RachaDetalleResult.Ok -> RachaContent(current.detalle)
            }
        }
    }
}

/**
 * Rediseño (7 oct 2026, "la pantalla de la racha es bastante fea"): arriba,
 * la llama dentro de un anillo que se llena hacia tu récord, sobre un brillo
 * cálido, con el número grande y qué hacer hoy; luego tres cifras con icono,
 * la semana actual día a día y el mapa de las últimas 5 semanas con leyenda.
 */
@Composable
private fun RachaContent(detalle: RachaDetalle) {
    val viva = detalle.actual > 0
    val hoyCuenta = (detalle.dias.lastOrNull()?.trofeos ?: 0) > 0
    val record = viva && detalle.actual >= detalle.mejor
    val progreso = if (detalle.mejor > 0) (detalle.actual.toFloat() / detalle.mejor).coerceIn(0f, 1f) else 0f
    val llama = if (viva) Color(0xFFFF8A3D) else Muted

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        // --- Héroe: anillo de progreso hacia el récord con la llama dentro.
        Box(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(radio(24)))
                .background(Surface2)
                .background(Brush.radialGradient(listOf(llama.copy(alpha = if (viva) 0.28f else 0.10f), Color.Transparent)))
                .padding(vertical = 22.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.size(132.dp), contentAlignment = Alignment.Center) {
                    androidx.compose.foundation.Canvas(Modifier.fillMaxSize()) {
                        val grosor = 9.dp.toPx()
                        val inset = grosor / 2
                        val tam = androidx.compose.ui.geometry.Size(size.width - grosor, size.height - grosor)
                        val esquina = androidx.compose.ui.geometry.Offset(inset, inset)
                        drawArc(Color.White.copy(alpha = 0.08f), 0f, 360f, false, esquina, tam, style = androidx.compose.ui.graphics.drawscope.Stroke(grosor))
                        if (progreso > 0f) {
                            drawArc(
                                Brush.sweepGradient(listOf(Color(0xFFFFC23D), Color(0xFFFF6A2B), Color(0xFFFFC23D))),
                                -90f, 360f * progreso, false, esquina, tam,
                                style = androidx.compose.ui.graphics.drawscope.Stroke(grosor, cap = androidx.compose.ui.graphics.StrokeCap.Round),
                            )
                        }
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Whatshot, contentDescription = null, tint = llama, modifier = Modifier.size(34.dp))
                        Text(
                            detalle.actual.toString(),
                            color = Foreground,
                            fontSize = 38.sp,
                            fontWeight = FontWeight.Bold,
                            lineHeight = 40.sp,
                            maxLines = 1,
                        )
                    }
                }
                Text(
                    if (viva) stringResource(if (detalle.actual == 1) T.racha_dia_seguido else T.racha_dias_seguidos) else Textos.t(T.racha_hoy),
                    color = Foreground,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 10.dp, start = 16.dp, end = 16.dp),
                )
                Text(
                    when {
                        !viva -> Textos.t(T.racha_activar)
                        record -> Textos.t(T.racha_es_record)
                        !hoyCuenta -> Textos.t(T.racha_falta_hoy, detalle.actual + 1)
                        else -> Textos.t(T.racha_hacia_record, detalle.mejor - detalle.actual)
                    },
                    color = if (record) Gold else Muted,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp, start = 16.dp, end = 16.dp),
                )
            }
        }

        // --- Tres cifras.
        Spacer(Modifier.height(14.dp))
        val trofeosSemana = detalle.dias.takeLast(7).sumOf { it.trofeos }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            CifraRacha(Icons.Default.EmojiEvents, Gold, "${detalle.mejor}", Textos.t(T.stats_mejor_racha), Modifier.weight(1f))
            CifraRacha(Icons.Default.CalendarMonth, Accent, "${detalle.diasActivos}", Textos.t(T.stats_dias_activos), Modifier.weight(1f))
            CifraRacha(Icons.Default.Bolt, llama, "$trofeosSemana", Textos.t(T.racha_trofeos_semana), Modifier.weight(1f))
        }

        // --- Esta semana, día a día.
        Titulo(Textos.t(T.racha_esta_semana))
        SemanaActual(detalle.dias.takeLast(7))

        // --- Últimas 5 semanas.
        Titulo(Textos.t(T.racha_semanas))
        DiasGrid(dias = detalle.dias)
        Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
            Text(Textos.t(T.racha_menos), color = Muted, fontSize = 11.sp)
            listOf(Surface2, Gold.copy(alpha = 0.35f), Gold.copy(alpha = 0.65f), Gold).forEach { c ->
                Box(Modifier.padding(start = 4.dp).size(12.dp).background(c, RoundedCornerShape(3.dp)))
            }
            Text(Textos.t(T.racha_mas), color = Muted, fontSize = 11.sp, modifier = Modifier.padding(start = 4.dp))
        }
    }
}

@Composable
private fun Titulo(texto: String) {
    Text(
        texto.uppercase(),
        color = Muted,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
        modifier = Modifier.fillMaxWidth().padding(top = 22.dp, bottom = 10.dp),
    )
}

@Composable
private fun CifraRacha(icono: androidx.compose.ui.graphics.vector.ImageVector, color: Color, valor: String, etiqueta: String, modifier: Modifier = Modifier) {
    Column(
        modifier.background(Surface2, RoundedCornerShape(radio(16))).padding(horizontal = 10.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(icono, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
        Text(valor, color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold, maxLines = 1, modifier = Modifier.padding(top = 4.dp))
        Text(etiqueta, color = Muted, fontSize = 11.sp, maxLines = 2, textAlign = TextAlign.Center, lineHeight = 13.sp)
    }
}

/** Los últimos 7 días (el último es hoy): inicial del día y un círculo lleno si hubo trofeo. */
@Composable
private fun SemanaActual(dias: List<DiaActividad>) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        dias.forEachIndexed { i, dia ->
            val esHoy = i == dias.lastIndex
            val activo = dia.trofeos > 0
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    inicialDia(dia.dia),
                    color = if (esHoy) Foreground else Muted,
                    fontSize = 12.sp,
                    fontWeight = if (esHoy) FontWeight.Bold else FontWeight.Medium,
                )
                Box(
                    Modifier.padding(top = 6.dp).size(36.dp)
                        .clip(CircleShape)
                        .background(if (activo) Brush.linearGradient(listOf(Color(0xFFFFC23D), Color(0xFFFF6A2B))) else Brush.linearGradient(listOf(Surface2, Surface2)))
                        .then(if (esHoy) Modifier.border(2.dp, Accent, CircleShape) else Modifier),
                    contentAlignment = Alignment.Center,
                ) {
                    if (activo) Icon(Icons.Default.Whatshot, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

/** "L", "M", "X"... del día ("2026-10-07"), en el idioma de la app. */
private fun inicialDia(dia: String): String {
    val millis = com.paragon.app.data.isoAMillis(dia.take(10) + "T12:00:00Z") ?: return ""
    return com.paragon.app.util.fechaConPatron(millis, "EEEEE").take(1).uppercase()
}

/** 5 filas de 7 — una semana por fila, empezando por la más antigua de los últimos 35 días. */
@Composable
private fun DiasGrid(dias: List<DiaActividad>) {
    val semanas = dias.chunked(7)
    // El último día de la lista es hoy (35 días terminando hoy) — un pulso
    // muy discreto ahí, no en el resto, para que se note dónde está "hoy"
    // sin que el calendario entero titile.
    val hoy = dias.lastOrNull()
    val transicion = rememberInfiniteTransition(label = "pulsoHoy")
    val pulsoAnimado by transicion.animateFloat(
        initialValue = 0.6f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1100), RepeatMode.Reverse),
        label = "pulsoHoyAlpha",
    )
    // Con "quitar animaciones" el día de hoy se queda fijo, sin titilar.
    val pulso = if (animacionesReducidas()) 1f else pulsoAnimado

    // Casillas de tamaño fijo y esquinas pequeñas (como el calendario de
    // contribuciones de GitHub): a todo el ancho eran bolas enormes.
    Column(verticalArrangement = Arrangement.spacedBy(6.dp), horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        semanas.forEach { semana ->
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                semana.forEach { dia ->
                    // Intensidad por cantidad de trofeos ese día, no solo
                    // "hubo o no hubo" — un día suelto y una tarde a tope
                    // se veían exactamente igual antes.
                    val color = when {
                        dia.trofeos >= 3 -> Gold
                        dia.trofeos == 2 -> Gold.copy(alpha = 0.65f)
                        dia.trofeos == 1 -> Gold.copy(alpha = 0.35f)
                        else -> Surface2
                    }
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .background(color, RoundedCornerShape(7.dp))
                            .then(
                                if (dia === hoy) {
                                    Modifier.border(2.dp, Accent.copy(alpha = pulso), RoundedCornerShape(7.dp))
                                } else Modifier,
                            ),
                    )
                }
                repeat(7 - semana.size) {
                    Spacer(modifier = Modifier.size(34.dp))
                }
            }
        }
    }
}
