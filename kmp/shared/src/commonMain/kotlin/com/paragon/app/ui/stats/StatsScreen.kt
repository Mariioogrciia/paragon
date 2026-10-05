package com.paragon.app.ui.stats

import androidx.compose.foundation.background
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.util.formatDecimal
import com.paragon.app.util.formatFechaCorta
import com.paragon.app.util.formatFechaLarga


import com.paragon.app.data.*
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*
import kotlin.math.roundToInt
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch




/**
 * Estadísticas reales contra GET /api/mobile/stats (StatsRepository) — la
 * versión curada para móvil (Paragon Score, ADN de trofeos, rachas,
 * histórico, financiero, eficiencia de caza y deuda de backlog), no las ~15
 * piezas de la web (`EstadisticasCompletas.tsx`).
 */
@Composable
fun StatsScreen(tokenStore: TokenStore, handle: String = "", database: com.paragon.app.data.local.ParagonDatabase, onBack: (() -> Unit)? = null) {
    val cacheDao = remember(database) { database.simpleCacheDao() }
    val repository = remember(tokenStore, cacheDao) { StatsRepository(tokenStore, cacheDao) }
    val achievementsRepository = remember(tokenStore) { AchievementsRepository(tokenStore) }
    val dietRepository = remember(tokenStore) { DietRepository(tokenStore) }
    var result by remember { mutableStateOf<StatsResult?>(null) }
    // Independientes de `result`: un fallo aquí (o tardar más) no debe
    // bloquear el resto de Estadísticas, que ya funcionaba sin esto.
    var achievements by remember { mutableStateOf<AchievementsResult?>(null) }
    var dieta by remember { mutableStateOf<DietaGamer?>(null) }
    var showWrap by remember { mutableStateOf(false) }
    val retryCounter = remember { mutableIntStateOf(0) }

    LaunchedEffect(retryCounter.value) {
        result = null
        // supervisorScope: un fallo en achievements o dieta NO debe
        // cancelar la petición principal de stats (ni al revés) — antes
        // con coroutineScope cualquier excepción no controlada en un hijo
        // cancelaba los tres, petando la pantalla entera.
        kotlinx.coroutines.supervisorScope {
            launch { result = repository.getStats() }
            launch { achievements = achievementsRepository.getAchievements() }
            launch { dieta = dietRepository.getDiet() }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
    Column(modifier = Modifier.fillMaxSize().background(Background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = Textos.t(T.comun_volver), tint = Foreground)
                }
            } else {
                Spacer(Modifier.width(16.dp))
            }
            Text(
                text = Textos.t(T.stats_titulo),
                color = Foreground,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = if (onBack != null) 0.dp else 16.dp).weight(1f),
            )
            IconButton(onClick = { showWrap = true }) {
                Text("✨", fontSize = 20.sp)
            }
        }

        when (val current = result) {
            null -> com.paragon.app.ui.common.EsqueletoTarjetas()
            is StatsResult.Error -> Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = current.message, color = Foreground, fontSize = 14.sp)
                    Button(
                        onClick = { retryCounter.value += 1 },
                        modifier = Modifier.padding(top = 16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Accent),
                    ) { Text(Textos.t(T.comun_reintentar)) }
                }
            }
            is StatsResult.Ok -> StatsContent(current.stats, handle, (achievements as? AchievementsResult.Ok), dieta, current.fromCache)
        }
    }

    if (showWrap) {
        com.paragon.app.ui.wrap.WrapStoriesScreen(tokenStore = tokenStore, onClose = { showWrap = false })
    }
    }
}

@Composable
private fun StatsContent(stats: ParagonStats, handle: String, achievements: AchievementsResult.Ok?, dieta: DietaGamer?, fromCache: Boolean = false) {
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
        // Mismo aviso que Biblioteca/Panel/Ficha de juego/Feed cuando se
        // sirve la caché de respaldo — Estadísticas no lo tenía (hueco real
        // visto en auditoría: era la única de las 5 pestañas principales
        // sin ningún respaldo offline).
        if (fromCache) {
            item {
                Text(text = Textos.t(T.comun_sin_conexion_copia), color = Muted, fontSize = 11.sp)
            }
        }
        dieta?.let { item { DietaGamerCard(it) } }
        item { ParagonScoreCard(stats.paragonScore) }
        item { TrophyDnaCard(stats.trophyDna, stats.estiloDeCaza) }
        item { RachasCard(stats.rachas, stats.historico) }
        item { FinancieroCard(stats.financiero, stats.horasTotales) }
        item { EficienciaCard(stats.eficiencia) }
        item { BacklogCard(stats.backlog) }
        achievements?.let { a ->
            if (a.trophyCase.isNotEmpty()) item { TrophyCaseCard(a.trophyCase) }
            if (a.badges.isNotEmpty()) item { BadgesCard(a.badges) }
        }
        item { HitosCard(stats.hitos) }
        item { GaleriaHitosCard(stats.hitos, handle) }
    }
}



private fun fechaCorta(iso: String): String =
    com.paragon.app.util.formatFechaCorta(iso)

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
            add(Triple(ICONO_GRADO[it.grade] ?: "🎮", Textos.t(T.stats_primer_trofeo), Textos.t(T.stats_hito_3, it.nombre, it.tituloJuego, fechaCorta(it.fecha))))
        }
        hitos.primerPlatino?.let {
            add(Triple("🏆", Textos.t(T.stats_primer_platino), Textos.t(T.comun_a_b, it.titulo, fechaCorta(it.fecha))))
        }
        hitos.trofeoMasRaro?.let {
            add(Triple("💎", Textos.t(T.stats_mas_raro), Textos.t(T.stats_mas_raro_det, it.nombre, com.paragon.app.util.formatDecimal(it.rarityPercent, 1), it.tituloJuego)))
        }
        hitos.platinoAnejo?.takeIf { it.dias >= 30 }?.let {
            val texto = if (it.dias >= 365) {
                Textos.t(T.stats_anejo_anios, it.dias / 365, (it.dias % 365) / 30)
            } else {
                Textos.t(T.stats_anejo_meses, it.dias / 30)
            }
            add(Triple("🍷", Textos.t(T.stats_anejo), Textos.t(T.comun_a_b, it.titulo, texto)))
        }
        hitos.rachaMasLarga?.takeIf { it.dias >= 3 }?.let {
            add(Triple("🔥", Textos.t(T.stats_racha_larga), Textos.t(T.stats_racha_det, it.dias, fechaCorta(it.desde), fechaCorta(it.hasta))))
        }
    }
    if (filas.isEmpty()) return

    SectionCard(title = Textos.t(T.stats_hitos), subtitle = Textos.t(T.stats_hitos_sub)) {
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
            add(HitoExportable("🎮", Textos.t(T.stats_primer_trofeo), Textos.t(T.comun_a_b, it.nombre, fechaCorta(it.fecha)), it.iconUrl, it.tituloJuego, Textos.t(T.stats_badge_primer), fechaLarga(it.fecha)))
        }
        hitos.trofeoMasRaro?.let {
            add(HitoExportable("💎", Textos.t(T.stats_mas_raro), Textos.t(T.stats_mas_raro_det2, it.nombre, formatDecimal(it.rarityPercent, 1)), it.iconUrl, it.tituloJuego, Textos.t(T.stats_badge_raro), it.nombre))
        }
        hitos.platinosHitos.forEach {
            add(HitoExportable("🏆", Textos.t(T.stats_platino_n, it.numero), Textos.t(T.comun_a_b, it.titulo, fechaCorta(it.fecha)), it.iconUrl, it.titulo, Textos.t(T.stats_badge_platino_n, it.numero), fechaLarga(it.fecha)))
        }
    }
    if (items.isEmpty()) return

    var compartiendo by remember { mutableStateOf<HitoExportable?>(null) }

    SectionCard(title = Textos.t(T.stats_galeria), subtitle = Textos.t(T.stats_galeria_sub)) {
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
                    Icon(Icons.Default.Share, contentDescription = Textos.t(T.stats_generar_tarjeta), tint = Accent)
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

private fun fechaLarga(iso: String): String =
    formatFechaLarga(iso)

@Composable
private fun SectionCard(title: String, subtitle: String? = null, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(radio(20)))
            .border(1.dp, Border, RoundedCornerShape(radio(20)))
            .padding(24.dp),
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

    SectionCard(title = "Paragon Score", subtitle = Textos.t(T.stats_score_sub)) {
        Text(text = animatedTotal.toString(), color = Accent2, fontSize = 40.sp, fontWeight = FontWeight.Bold)
        if (score.porPlataforma.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            score.porPlataforma.forEach { fila ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(text = fila.platform.uppercase(), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Text(text = Textos.t(T.stats_score_fila, com.paragon.app.ui.panel.cifra(fila.puntos), com.paragon.app.ui.panel.cifra(fila.trofeos)), color = Foreground, fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun TrophyDnaCard(dna: TrophyDnaStats, estiloDeCaza: EstiloDeCazaStats?) {
    SectionCard(
        title = Textos.t(T.stats_adn),
        subtitle = dna.arquetipo?.let { Textos.t(T.stats_arquetipo, it) } ?: Textos.t(T.stats_arquetipo_no),
    ) {
        // Distinto del arquetipo de arriba (ese es de GÉNERO) — esto es el
        // estilo de caza: cómo juegas, no a qué.
        if (estiloDeCaza != null) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .background(Surface2, RoundedCornerShape(radio(14)))
                    .padding(14.dp),
            ) {
                Text(text = Textos.t(T.stats_estilo), color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
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
                text = Textos.t(T.stats_gira),
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
                Box(modifier = Modifier.fillMaxWidth().height(6.dp).background(Surface2, RoundedCornerShape(radio(3)))) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraccionAnimada)
                            .fillMaxHeight()
                            .background(Accent, RoundedCornerShape(radio(3))),
                    )
                }
            }
        }
    }
}

@Composable
private fun RachasCard(rachas: RachasStats, historico: HistoricoStats) {
    SectionCard(title = Textos.t(T.stats_rachas)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MiniStat(label = Textos.t(T.stats_racha_actual), value = "${rachas.actual}d", modifier = Modifier.weight(1f))
            MiniStat(label = Textos.t(T.stats_mejor_racha), value = "${rachas.mejor}d", modifier = Modifier.weight(1f))
            MiniStat(label = Textos.t(T.stats_dias_activos), value = rachas.diasActivos.toString(), modifier = Modifier.weight(1f))
        }
        Spacer(Modifier.height(16.dp))
        Text(
            text = Textos.t(T.stats_historico, historico.conFecha, historico.esteAnio),
            color = Muted,
            fontSize = 12.sp,
        )
        historico.mejorMes?.let {
            Text(
                text = Textos.t(T.stats_mejor_mes, it.mes, it.total),
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
    SectionCard(title = Textos.t(T.stats_horas)) {
        Text(text = "${com.paragon.app.ui.panel.cifra(horasTotales)} h", color = Accent2, fontSize = 40.sp, fontWeight = FontWeight.Bold)
        Text(
            // Mismo dato que "Si juntaras las X horas... serían Y días" de
            // PlaytimeComparison.tsx en la web, para que cuadre con lo que
            // ya conoce quien también mira la web.
            text = Textos.t(T.stats_horas_dias, horasTotales / 24),
            color = Muted,
            fontSize = 12.sp,
            modifier = Modifier.padding(top = 4.dp),
        )

        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = Border)
        Spacer(Modifier.height(16.dp))

        Text(text = Textos.t(T.stats_coste), color = Foreground, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Text(text = Textos.t(T.stats_coste_sub), color = Muted, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp, bottom = 10.dp))

        if (financiero.juegosConDatos == 0) {
            Text(text = Textos.t(T.stats_sin_datos), color = Muted, fontSize = 13.sp)
        } else {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MiniStat(label = Textos.t(T.stats_gastado), value = "${financiero.totalGastado.roundToInt()}€", modifier = Modifier.weight(1f))
                MiniStat(label = Textos.t(T.stats_horas_precio), value = financiero.totalHoras.roundToInt().toString(), modifier = Modifier.weight(1f))
                MiniStat(
                    label = "€/hora",
                    value = financiero.costeHoraMedio?.let { "${formatDecimal(it, 2)}€" } ?: "—",
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun EficienciaCard(eficiencia: EficienciaStats) {
    SectionCard(title = Textos.t(T.stats_eficiencia), subtitle = Textos.t(T.stats_eficiencia_sub)) {
        val ritmoMedioPct = eficiencia.ritmoMedioPct
        if (eficiencia.juegosConDatos == 0 || ritmoMedioPct == null) {
            Text(text = Textos.t(T.stats_sin_datos), color = Muted, fontSize = 13.sp)
        } else {
            val esMasRapido = ritmoMedioPct >= 0
            Text(
                text = "${if (esMasRapido) "+" else ""}${ritmoMedioPct}%",
                color = if (esMasRapido) Good else Danger,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = if (esMasRapido) Textos.t(T.stats_mas_rapido) else Textos.t(T.stats_mas_calma),
                color = Muted,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

@Composable
private fun BacklogCard(backlog: BacklogStats) {
    SectionCard(title = Textos.t(T.stats_backlog), subtitle = Textos.t(T.stats_backlog_sub)) {
        if (backlog.juegosContados == 0) {
            Text(text = Textos.t(T.stats_backlog_vacio), color = Muted, fontSize = 13.sp)
        } else {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MiniStat(label = Textos.t(T.stats_hasta_final), value = "${backlog.horasHistoriaRestantes.roundToInt()}h", modifier = Modifier.weight(1f))
                MiniStat(label = Textos.t(T.stats_hasta_platino), value = "${backlog.horasPlatinoRestantes.roundToInt()}h", modifier = Modifier.weight(1f))
                MiniStat(label = Textos.t(T.stats_juegos_contados), value = backlog.juegosContados.toString(), modifier = Modifier.weight(1f))
            }
        }
    }
}

private val ICONO_LIGA = mapOf("liga_mensual" to "🌐", "liga_privada" to "👥")

/**
 * Palmarés real: SOLO el ganador absoluto (nunca Top 3) de la Liga Mensual
 * o de una Liga privada cerrada — ver lib/trophyCase.ts en el proyecto
 * Next.js ("si casi cualquiera acaba con una copa, deja de significar
 * nada"). Sin tarjeta si está vacío (la mayoría de cuentas, todavía).
 */
@Composable
private fun TrophyCaseCard(trophyCase: List<TrophyCaseAward>) {
    SectionCard(title = Textos.t(T.stats_palmares), subtitle = Textos.t(T.stats_palmares_sub)) {
        trophyCase.forEachIndexed { index, award ->
            if (index > 0) {
                Spacer(Modifier.height(12.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(12.dp))
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = ICONO_LIGA[award.kind] ?: "🏆", fontSize = 20.sp, modifier = Modifier.padding(end = 12.dp))
                Column {
                    Text(text = award.titulo, color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(text = fechaCorta(award.earnedAt), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
                }
            }
        }
    }
}

private val ICONO_BADGE = mapOf(
    "first_blood" to "🏆",
    "cazador" to "🎯",
    "experto" to "⭐",
    "leyenda" to "👑",
    "coleccionista" to "📚",
    "madrugador" to "🌅",
    "critico" to "✍️",
    "sociable" to "🤝",
    "rolero" to "🐉",
    "multiplataforma" to "🎮",
)

/** Insignias por hitos (`checkAndGrantBadges`, se conceden solas al sincronizar) — sin tarjeta si no hay ninguna todavía. */
@Composable
private fun BadgesCard(badges: List<Badge>) {
    SectionCard(title = "Badges", subtitle = Textos.t(T.stats_badges_sub)) {
        badges.forEachIndexed { index, badge ->
            if (index > 0) {
                Spacer(Modifier.height(12.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(12.dp))
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = ICONO_BADGE[badge.id] ?: "🏅", fontSize = 20.sp, modifier = Modifier.padding(end = 12.dp))
                Column {
                    Text(text = badge.name, color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(text = badge.description, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
                }
            }
        }
    }
}

/**
 * "🥗 Tu dieta gamer está muy densa" — aviso amistoso (nunca un bloqueo) si
 * los últimos 3 juegos terminados comparten género y suman muchas horas.
 * Ver dietaGamer() en lib/dietaGamer.ts (proyecto Next.js) para los
 * umbrales exactos. Mismo texto que DietaGamer.tsx en la web.
 */
@Composable
private fun DietaGamerCard(dieta: DietaGamer) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(radio(20)))
            .border(1.dp, Border, RoundedCornerShape(radio(20)))
            .padding(24.dp),
    ) {
        Text(text = Textos.t(T.stats_dieta), color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        val juegos = dieta.juegos.joinToString(", ") { it.titulo }
        Text(
            text = Textos.t(T.stats_dieta_texto, juegos, dieta.genero, dieta.horasTotales),
            color = Muted,
            fontSize = 13.sp,
            lineHeight = 19.sp,
        )
    }
}

@Composable
private fun MiniStat(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Surface2, RoundedCornerShape(radio(14)))
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




