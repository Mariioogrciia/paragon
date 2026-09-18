package com.paragon.app.ui.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.*
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*
import kotlin.math.roundToInt

/**
 * Estadísticas reales contra GET /api/mobile/stats (StatsRepository) — la
 * versión curada para móvil (Paragon Score, ADN de trofeos, rachas,
 * histórico, financiero, eficiencia de caza y deuda de backlog), no las ~15
 * piezas de la web (`EstadisticasCompletas.tsx`).
 */
@Composable
fun StatsScreen(tokenStore: TokenStore, handle: String = "", onBack: (() -> Unit)? = null) {
    val repository = remember(tokenStore) { StatsRepository(tokenStore) }
    var result by remember { mutableStateOf<StatsResult?>(null) }
    val retryCounter = remember { mutableIntStateOf(0) }

    LaunchedEffect(retryCounter.value) {
        result = null
        result = repository.getStats()
    }

    Column(modifier = Modifier.fillMaxSize().background(Background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = Foreground)
                }
            } else {
                Spacer(Modifier.width(16.dp))
            }
            Text(
                text = "ESTADÍSTICAS",
                color = Foreground,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = if (onBack != null) 0.dp else 16.dp),
            )
        }

        when (val current = result) {
            null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Accent)
            }
            is StatsResult.Error -> Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = current.message, color = Foreground, fontSize = 14.sp)
                    Button(
                        onClick = { retryCounter.value += 1 },
                        modifier = Modifier.padding(top = 16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Accent),
                    ) { Text("Reintentar") }
                }
            }
            is StatsResult.Ok -> StatsContent(current.stats, handle)
        }
    }
}

@Composable
private fun StatsContent(stats: ParagonStats, handle: String) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        // 32dp se quedaba corto y la última tarjeta (o el radar, según el
        // tamaño de pantalla) terminaba pegada a la barra de navegación de
        // abajo — más aún cuando esa barra se oculta/aparece al hacer
        // scroll (ver bottomBarVisible en MainScreen.kt) y el hueco
        // reservado cambia de tamaño en el momento.
        contentPadding = PaddingValues(top = 8.dp, bottom = 96.dp),
    ) {
        item { ParagonScoreCard(stats.paragonScore) }
        item { TrophyDnaCard(stats.trophyDna, stats.estiloDeCaza) }
        item { RachasCard(stats.rachas, stats.historico) }
        item { FinancieroCard(stats.financiero, stats.horasTotales) }
        item { EficienciaCard(stats.eficiencia) }
        item { BacklogCard(stats.backlog) }
        item { HitosCard(stats.hitos) }
        item { GaleriaHitosCard(stats.hitos, handle) }
    }
}

private val FECHA_ISO = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
    timeZone = java.util.TimeZone.getTimeZone("UTC")
}
private val FECHA_CORTA = java.text.SimpleDateFormat("d MMM yyyy", java.util.Locale("es", "ES"))

private fun fechaCorta(iso: String): String =
    try { FECHA_CORTA.format(FECHA_ISO.parse(iso)!!) } catch (e: Exception) { iso }

private val ICONO_GRADO = mapOf("bronze" to "🥉", "silver" to "🥈", "gold" to "🥇", "platinum" to "🏆")

/**
 * Hitos de toda la carrera de trofeos (no de una ventana de tiempo) — mismo
 * dato que la línea de tiempo de la web (HistoricalTimeline.tsx). Cada hito
 * puede faltar (p. ej. sin ningún platino todavía); se omite su fila, no se
 * enseña vacía. Si no hay NINGÚN hito, no se pinta ni la tarjeta.
 */
@Composable
private fun HitosCard(hitos: HitosStats) {
    val filas = buildList {
        hitos.primerTrofeo?.let {
            add(Triple(ICONO_GRADO[it.grade] ?: "🎮", "Tu primer trofeo", "${it.nombre} · ${it.tituloJuego} · ${fechaCorta(it.fecha)}"))
        }
        hitos.primerPlatino?.let {
            add(Triple("🏆", "Tu primer platino", "${it.titulo} · ${fechaCorta(it.fecha)}"))
        }
        hitos.trofeoMasRaro?.let {
            add(Triple("💎", "Tu trofeo más raro", "${it.nombre} · ${"%.1f".format(it.rarityPercent)}% lo tiene · ${it.tituloJuego}"))
        }
        hitos.platinoAnejo?.takeIf { it.dias >= 30 }?.let {
            val texto = if (it.dias >= 365) {
                "${it.dias / 365} años y ${(it.dias % 365) / 30} meses en caer"
            } else {
                "${it.dias / 30} meses en caer"
            }
            add(Triple("🍷", "El platino añejo", "${it.titulo} · $texto"))
        }
        hitos.rachaMasLarga?.takeIf { it.dias >= 3 }?.let {
            add(Triple("🔥", "Tu racha más larga", "${it.dias} días seguidos, del ${fechaCorta(it.desde)} al ${fechaCorta(it.hasta)}"))
        }
    }
    if (filas.isEmpty()) return

    SectionCard(title = "Hitos de tu carrera", subtitle = "Toda tu historia de trofeos, no solo este año") {
        filas.forEachIndexed { index, (icono, etiqueta, detalle) ->
            if (index > 0) {
                Spacer(Modifier.height(12.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(12.dp))
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = icono, fontSize = 20.sp, modifier = Modifier.padding(end = 12.dp))
                Column {
                    Text(text = etiqueta, color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Text(text = detalle, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
                }
            }
        }
    }
}

/** Un hito exportable — lo justo para pintar una fila y generar su tarjeta. */
private data class HitoExportable(
    val icono: String,
    val etiqueta: String,
    val detalle: String,
    val coverUrl: String?,
    val gameTitle: String,
    val badge: String,
    val subtitle: String,
)

/**
 * "Galería de Hitos" — idea #5 del brainstorm: los mismos hitos de la
 * tarjeta de arriba, pero con un botón para generar un póster vertical
 * (reutiliza TrophyShareCard/ShareTrophyDialog, la misma pieza que ya usa
 * GameDetailScreen para "Compartir Platino") y guardarlo/compartirlo. Los
 * platinos "redondos" (#1, #10, #25, #50...) vienen ya filtrados del
 * backend (platinosHitos en hitosHistoricos, lib/profileStats.ts) — aquí no
 * se decide cuáles son hito, solo se pintan.
 */
@Composable
private fun GaleriaHitosCard(hitos: HitosStats, handle: String) {
    val items = buildList {
        hitos.primerTrofeo?.let {
            add(HitoExportable("🎮", "Tu primer trofeo", "${it.nombre} · ${fechaCorta(it.fecha)}", it.iconUrl, it.tituloJuego, "PRIMER TROFEO", fechaLarga(it.fecha)))
        }
        hitos.trofeoMasRaro?.let {
            add(HitoExportable("💎", "Tu trofeo más raro", "${it.nombre} · ${"%.1f".format(it.rarityPercent)}% lo tiene", it.iconUrl, it.tituloJuego, "TROFEO MÁS RARO", it.nombre))
        }
        hitos.platinosHitos.forEach {
            add(HitoExportable("🏆", "Tu platino #${it.numero}", "${it.titulo} · ${fechaCorta(it.fecha)}", it.iconUrl, it.titulo, "TU PLATINO #${it.numero}", fechaLarga(it.fecha)))
        }
    }
    if (items.isEmpty()) return

    var compartiendo by remember { mutableStateOf<HitoExportable?>(null) }

    SectionCard(title = "Galería de hitos", subtitle = "Genera un póster para guardar o compartir") {
        items.forEachIndexed { index, item ->
            if (index > 0) {
                Spacer(Modifier.height(12.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(12.dp))
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = item.icono, fontSize = 20.sp, modifier = Modifier.padding(end = 12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = item.etiqueta, color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Text(text = item.detalle, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
                }
                IconButton(onClick = { compartiendo = item }) {
                    Icon(Icons.Default.Share, contentDescription = "Generar tarjeta", tint = Accent)
                }
            }
        }
    }

    compartiendo?.let { item ->
        com.paragon.app.ui.share.ShareTrophyDialog(
            coverUrl = item.coverUrl ?: "",
            gameTitle = item.gameTitle,
            handle = handle,
            badge = item.badge,
            subtitle = item.subtitle,
            onDismiss = { compartiendo = null },
        )
    }
}

private val FECHA_LARGA = java.text.SimpleDateFormat("d 'de' MMMM 'de' yyyy", java.util.Locale("es", "ES"))

private fun fechaLarga(iso: String): String =
    try { FECHA_LARGA.format(FECHA_ISO.parse(iso)!!) } catch (e: Exception) { iso }

@Composable
private fun SectionCard(title: String, subtitle: String? = null, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(20.dp))
            .border(1.dp, Border, RoundedCornerShape(20.dp))
            .padding(20.dp),
    ) {
        Text(text = title.uppercase(), color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        if (subtitle != null) {
            Text(text = subtitle, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp, bottom = 12.dp))
        } else {
            Spacer(Modifier.height(12.dp))
        }
        content()
    }
}

@Composable
private fun ParagonScoreCard(score: ParagonScoreStats) {
    // Cuenta de 0 al valor real en ~800ms — un número grande que aparece
    // ya hecho se lee, pero no se siente; contarlo hace que el ojo se pare
    // ahí un segundo, que es justo el sitio donde más queremos que se pare.
    var animatedTotal by remember(score.total) { mutableStateOf(0) }
    LaunchedEffect(score.total) {
        androidx.compose.animation.core.animate(
            initialValue = 0f,
            targetValue = score.total.toFloat(),
            animationSpec = androidx.compose.animation.core.tween(800),
        ) { value, _ -> animatedTotal = value.toInt() }
    }

    SectionCard(title = "Paragon Score", subtitle = "Puntuación unificada entre plataformas") {
        Text(text = animatedTotal.toString(), color = Accent2, fontSize = 40.sp, fontWeight = FontWeight.Bold)
        if (score.porPlataforma.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            score.porPlataforma.forEach { fila ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(text = fila.platform.uppercase(), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Text(text = "${fila.puntos} pts · ${fila.trofeos} trofeos", color = Foreground, fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun TrophyDnaCard(dna: TrophyDnaStats, estiloDeCaza: EstiloDeCazaStats?) {
    SectionCard(
        title = "ADN de trofeos",
        subtitle = dna.arquetipo?.let { "Tu arquetipo: $it" } ?: "Sigue jugando para desbloquear tu arquetipo",
    ) {
        // Distinto del arquetipo de arriba (ese es de GÉNERO) — esto es el
        // estilo de caza: cómo juegas, no a qué.
        if (estiloDeCaza != null) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .background(Surface2, RoundedCornerShape(14.dp))
                    .padding(14.dp),
            ) {
                Text(text = "TU ESTILO DE CAZA", color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Text(text = estiloDeCaza.nombre, color = Foreground, fontSize = 17.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 2.dp))
                Text(text = estiloDeCaza.descripcion, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
            }
        }
        if (dna.ejes.size >= 3) {
            TrophyDnaRadar(
                ejes = dna.ejes,
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            )
            Text(
                text = "Gira el gráfico con el dedo",
                color = Muted,
                fontSize = 11.sp,
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }

        val max = dna.ejes.maxOfOrNull { it.valor } ?: 0
        dna.ejes.sortedByDescending { it.valor }.forEach { eje ->
            Column(modifier = Modifier.padding(vertical = 6.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(text = eje.label, color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Text(text = "${eje.trofeos}", color = Muted, fontSize = 12.sp)
                }
                Spacer(Modifier.height(6.dp))
                val fraccionObjetivo = if (max > 0) eje.valor / 100f else 0f
                val fraccionAnimada by androidx.compose.animation.core.animateFloatAsState(
                    targetValue = fraccionObjetivo,
                    animationSpec = androidx.compose.animation.core.tween(700),
                    label = "ejeDna",
                )
                Box(modifier = Modifier.fillMaxWidth().height(6.dp).background(Surface2, RoundedCornerShape(3.dp))) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraccionAnimada)
                            .fillMaxHeight()
                            .background(Accent, RoundedCornerShape(3.dp)),
                    )
                }
            }
        }
    }
}

@Composable
private fun RachasCard(rachas: RachasStats, historico: HistoricoStats) {
    SectionCard(title = "Rachas y actividad") {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MiniStat(label = "Racha actual", value = "${rachas.actual}d", modifier = Modifier.weight(1f))
            MiniStat(label = "Mejor racha", value = "${rachas.mejor}d", modifier = Modifier.weight(1f))
            MiniStat(label = "Días activos", value = rachas.diasActivos.toString(), modifier = Modifier.weight(1f))
        }
        Spacer(Modifier.height(16.dp))
        Text(
            text = "${historico.conFecha} trofeos con fecha conocida · ${historico.esteAnio} este año",
            color = Muted,
            fontSize = 12.sp,
        )
        historico.mejorMes?.let {
            Text(
                text = "Tu mejor mes: ${it.mes} (${it.total} trofeos)",
                color = Foreground,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

/**
 * Las horas jugadas (`horasTotales`, YA en horas — `lib/profileStats.ts`
 * devuelve horas, no minutos, pese al nombre viejo del campo que tenía la
 * API) son un dato de siempre, sin depender de nada más — se enseñan
 * primero y siempre, grandes. El coste por hora sí necesita precio Y tiempo
 * jugado guardados por juego (ver `resumenFinanciero` en lib/backlog.ts),
 * así que eso va aparte, debajo, y solo cuando hay datos — nunca escondiendo
 * las horas si falta el precio.
 */
@Composable
private fun FinancieroCard(financiero: FinancieroStats, horasTotales: Int) {
    SectionCard(title = "Horas jugadas") {
        Text(text = "${"%,d".format(horasTotales).replace(",", ".")}h", color = Accent2, fontSize = 40.sp, fontWeight = FontWeight.Bold)
        Text(
            // Mismo dato que "Si juntaras las X horas... serían Y días" de
            // PlaytimeComparison.tsx en la web, para que cuadre con lo que
            // ya conoce quien también mira la web.
            text = "= ${horasTotales / 24} días seguidos · en todas tus plataformas",
            color = Muted,
            fontSize = 12.sp,
            modifier = Modifier.padding(top = 4.dp),
        )

        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = Border)
        Spacer(Modifier.height(16.dp))

        Text(text = "COSTE POR HORA", color = Foreground, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Text(text = "Solo juegos con precio y tiempo jugado registrados", color = Muted, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp, bottom = 10.dp))

        if (financiero.juegosConDatos == 0) {
            Text(text = "Sin datos suficientes todavía.", color = Muted, fontSize = 13.sp)
        } else {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MiniStat(label = "Gastado", value = "${financiero.totalGastado.roundToInt()}€", modifier = Modifier.weight(1f))
                MiniStat(label = "Horas con precio", value = financiero.totalHoras.roundToInt().toString(), modifier = Modifier.weight(1f))
                MiniStat(
                    label = "€/hora",
                    value = financiero.costeHoraMedio?.let { "%.2f€".format(it) } ?: "—",
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun EficienciaCard(eficiencia: EficienciaStats) {
    SectionCard(title = "Eficiencia de caza", subtitle = "Tu ritmo real frente a la estimación de HowLongToBeat") {
        if (eficiencia.juegosConDatos == 0 || eficiencia.ritmoMedioPct == null) {
            Text(text = "Sin datos suficientes todavía.", color = Muted, fontSize = 13.sp)
        } else {
            val esMasRapido = eficiencia.ritmoMedioPct >= 0
            Text(
                text = "${if (esMasRapido) "+" else ""}${eficiencia.ritmoMedioPct}%",
                color = if (esMasRapido) Good else Danger,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = if (esMasRapido) "Más rápido que la media de HLTB" else "Te lo tomas con más calma que la media",
                color = Muted,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

@Composable
private fun BacklogCard(backlog: BacklogStats) {
    SectionCard(title = "Deuda de backlog", subtitle = "Horas restantes en lo que ya empezaste") {
        if (backlog.juegosContados == 0) {
            Text(text = "Nada empezado con dato de HowLongToBeat todavía.", color = Muted, fontSize = 13.sp)
        } else {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MiniStat(label = "Hasta el final", value = "${backlog.horasHistoriaRestantes.roundToInt()}h", modifier = Modifier.weight(1f))
                MiniStat(label = "Hasta el platino", value = "${backlog.horasPlatinoRestantes.roundToInt()}h", modifier = Modifier.weight(1f))
                MiniStat(label = "Juegos contados", value = backlog.juegosContados.toString(), modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun MiniStat(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Surface2, RoundedCornerShape(14.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(
            text = value,
            color = Foreground,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
        )
        Text(
            text = label,
            color = Muted,
            fontSize = 11.sp,
            maxLines = 1,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
        )
    }
}
