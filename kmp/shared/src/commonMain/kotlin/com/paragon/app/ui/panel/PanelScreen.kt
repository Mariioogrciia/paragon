package com.paragon.app.ui.panel

import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import com.paragon.app.ui.common.premiumClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Star
import com.paragon.app.data.isoAMillis
import com.paragon.app.util.fechaConPatron
import com.paragon.app.util.numeroLocal
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.paragon.app.data.GlobalStats
import com.paragon.app.data.HighlightsResult
import com.paragon.app.data.HitoReservado
import com.paragon.app.data.LibraryGame
import com.paragon.app.data.LibraryRepository
import com.paragon.app.data.CompareRepository
import com.paragon.app.data.CompareResult
import com.paragon.app.data.CompareSide
import com.paragon.app.data.MilestoneRepository
import com.paragon.app.data.MilestoneResult
import com.paragon.app.data.PanelRepository
import com.paragon.app.data.TrophyCounts
import com.paragon.app.data.UserProfile
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.navigation.Screen
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import coil3.compose.AsyncImage
import com.paragon.app.data.theme.ThemeStore
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Foreground

/**
 * `userProfile`/`globalStats` ya son reales (bajan desde AppRoot vía
 * MainScreen — /api/mobile/panel, incluido el desglose por metal
 * oro/plata/bronce). "A un paso del platino"/"recientes" ya son reales
 * también (/api/mobile/panel/highlights, mismo cálculo que la portada web).
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalSharedTransitionApi::class)
@Composable
fun PanelScreen(
    navController: NavController,
    tokenStore: TokenStore,
    themeStore: ThemeStore,
    userProfile: UserProfile,
    globalStats: GlobalStats,
    fromCache: Boolean = false,
    racha: com.paragon.app.data.RachaGlobal = com.paragon.app.data.RachaGlobal(0, 0),
    onRacha: () -> Unit = {},
    onPerfil: () -> Unit = {},
    onBiblioteca: () -> Unit = {},
    sharedTransitionScope: androidx.compose.animation.SharedTransitionScope? = null,
    animatedVisibilityScope: androidx.compose.animation.AnimatedVisibilityScope? = null,
) {
    val repository = remember(tokenStore) { PanelRepository(tokenStore) }
    val context = com.paragon.shared.contextoPlataforma()
    val db = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context) }
    val libraryRepository = remember(tokenStore, db) { LibraryRepository(tokenStore, db.libraryDao(), context) }
    val milestoneRepository = remember(tokenStore) { MilestoneRepository(tokenStore) }
    val compareRepository = remember(tokenStore) { CompareRepository(tokenStore) }
    var highlights by remember { mutableStateOf<HighlightsResult?>(null) }
    var pinnedGame by remember { mutableStateOf<LibraryGame?>(null) }
    var hito by remember { mutableStateOf<HitoReservado?>(null) }
    var rivalComparison by remember { mutableStateOf<CompareResult?>(null) }
    // Tu próxima sesión: una en la que estés (o organices); si no, ninguna.
    var proximaSesion by remember { mutableStateOf<com.paragon.shared.red.SesionDto?>(null) }
    val sesionesRepository = remember(tokenStore) { com.paragon.app.data.SesionesRepository(tokenStore) }
    
    val haptic = LocalHapticFeedback.current
    val retryCounter = remember { mutableIntStateOf(0) }
    var isInitialLoading by remember { mutableStateOf(true) }
    // API estable de Material3 1.3.0+ (llegó con el BOM subido para el
    // shared element): `PullToRefreshState` ya no lleva `isRefreshing`/
    // `endRefresh()` como en la vieja API experimental — ahora ese estado
    // lo posee quien llama, y `PullToRefreshBox` maneja el nestedScroll
    // solo, sin `Modifier.nestedScroll(state.nestedScrollConnection)`.
    var isRefreshing by remember { mutableStateOf(false) }
    var showConfetti by remember { mutableStateOf(false) }

    LaunchedEffect(showConfetti) {
        if (showConfetti) {
            // En iPhone, la vibración de platino de Core Haptics (HapticosIOS.swift).
            com.paragon.shared.hapticos.trofeo("platino")
            kotlinx.coroutines.delay(2300)
            showConfetti = false
        }
    }

    LaunchedEffect(retryCounter.value) {
        if (highlights == null) isInitialLoading = true
        coroutineScope {
            launch { highlights = repository.getHighlights() }
            launch { pinnedGame = libraryRepository.findPinnedGame() }
            launch { hito = (milestoneRepository.getMilestone() as? MilestoneResult.Ok)?.hito }
            launch {
                val r = sesionesRepository.listar() as? com.paragon.app.data.SesionResultado.Ok
                proximaSesion = r?.valor?.sesiones?.firstOrNull { (it.estoyApuntado || it.soyAnfitrion) && !it.cancelada }
            }
            launch {
                themeStore.rivalHandle?.let { handle ->
                    rivalComparison = compareRepository.compare(handle)
                }
            }
        }
        isInitialLoading = false
        isRefreshing = false
    }

    Box(modifier = Modifier.fillMaxSize()) {
    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            isRefreshing = true
            retryCounter.value += 1
        },
        modifier = Modifier.fillMaxSize(),
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(Background),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            item { Column {
                // Rediseño del 5 oct 2026 (maqueta "1 · Inicio"): cabecera propia
                // (la barra de arriba de la app no sale aquí), "Tu objetivo" con
                // el siguiente trofeo, tres cifras y tu próxima sesión.
                CabeceraInicio(userProfile, racha, onRacha = onRacha, onPerfil = onPerfil)
                if (fromCache) {
                    Text(
                        text = Textos.t(T.comun_sin_conexion_copia),
                        color = Muted,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                // Diseño v2 (5 oct 2026, maqueta "01 · Inicio"): tres cifras, "Sigue
                // jugando" con carátulas grandes y "Para hoy" como lista agrupada.
                CifrasInicio(
                    nivel = userProfile.level,
                    platinos = globalStats.platinums,
                    trofeos = globalStats.trophies,
                    onPlatinos = { showConfetti = true },
                )
                val ok = highlights as? HighlightsResult.Ok
                val recientes = ok?.recent.orEmpty()
                if (recientes.isNotEmpty()) {
                    TituloSeccion(Textos.t(T.inicio_sigue_jugando), Textos.t(T.inicio_ver_todo)) { onBiblioteca() }
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(horizontal = 20.dp),
                    ) {
                        items(recientes, key = { it.id }) { game ->
                            TarjetaSigueJugando(
                                game = game,
                                onClick = { navController.navigate(Screen.GameDetail.routeFor(game.id)) },
                                sharedTransitionScope = sharedTransitionScope,
                                animatedVisibilityScope = animatedVisibilityScope,
                            )
                        }
                    }
                } else if (highlights == null && isInitialLoading) {
                    com.paragon.app.ui.common.EsqueletoTarjetas(tarjetas = 1, alto = 280.dp, modifier = Modifier.padding(top = 24.dp).fillMaxWidth().height(300.dp))
                }

                val cercano = ok?.nearPlatinum?.firstOrNull()
                // Un juego anclado ya platinado (solo le faltan DLC) no es "siguiente platino".
                val objetivo = pinnedGame?.toGameProgress()?.takeIf { !it.platinado } ?: cercano
                val siguientes = ok?.nextTrophies.orEmpty()
                val siguienteDelObjetivo = objetivo?.let { o -> siguientes.firstOrNull { it.gameId == o.id } }
                val otrosSiguientes = siguientes.filter { it !== siguienteDelObjetivo }.take(2)
                TituloSeccion(Textos.t(T.inicio_para_hoy))
                val filas = mutableListOf<@Composable () -> Unit>()
                objetivo?.let { o ->
                    filas += {
                        val faltan = (o.totalTrophies - o.earnedTrophies).coerceAtLeast(0)
                        com.paragon.app.ui.common.FilaNativa(
                            icono = Icons.Default.EmojiEvents,
                            titulo = Textos.t(T.inicio_siguiente_platino_de, o.title),
                            subtitulo = listOfNotNull(
                                Textos.t(T.inicio_faltan_n, faltan),
                                siguienteDelObjetivo?.trophyName,
                            ).joinToString(" · "),
                            valor = "${o.percent}%",
                            onClick = { navController.navigate(Screen.GameDetail.routeFor(o.id)) },
                        )
                    }
                }
                proximaSesion?.let { sesion ->
                    filas += {
                        val millis = isoAMillis(sesion.fechaHora)
                        com.paragon.app.ui.common.FilaNativa(
                            icono = Icons.Default.Groups,
                            titulo = sesion.trofeo,
                            subtitulo = listOfNotNull(sesion.juego.titulo, millis?.let { fechaConPatron(it, "EEEHHmm") }).joinToString(" · "),
                            valor = "${sesion.ocupadas}/${sesion.plazasTotales}",
                            onClick = { navController.navigate(Screen.SessionDetail.routeFor(sesion.id)) },
                        )
                    }
                }
                otrosSiguientes.forEach { trofeo ->
                    filas += {
                        com.paragon.app.ui.common.FilaNativa(
                            icono = Icons.Default.Star,
                            titulo = trofeo.trophyName,
                            subtitulo = listOfNotNull(
                                trofeo.gameTitle,
                                trofeo.rarityPercent?.let { "${numeroLocal(it, 1)} %" },
                            ).joinToString(" · "),
                            onClick = { navController.navigate(Screen.GameDetail.routeFor(trofeo.gameId, trofeo.trophyId)) },
                        )
                    }
                }
                filas += {
                    com.paragon.app.ui.common.FilaNativa(
                        icono = Icons.Default.Lock,
                        titulo = Textos.t(T.nav_atascados_menu),
                        onClick = { navController.navigate(Screen.StuckTrophies.route) },
                    )
                }
                com.paragon.app.ui.common.GrupoNativo(modifier = Modifier.padding(horizontal = 20.dp)) {
                    filas.forEachIndexed { i, fila ->
                        if (i > 0) com.paragon.app.ui.common.SeparadorFila()
                        fila()
                    }
                }
                (highlights as? HighlightsResult.Error)?.let { e ->
                    Row(Modifier.padding(horizontal = 24.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(text = e.message, color = Muted, fontSize = 13.sp, modifier = Modifier.weight(1f))
                        TextButton(onClick = { retryCounter.value += 1 }) {
                            Text(Textos.t(T.comun_reintentar), color = Accent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        }
                    }
                }

                // Últimos trofeos — los más recientes de toda la biblioteca,
                // como en el perfil web (RecentTrophies.tsx).
                val ultimos = ok?.latestTrophies.orEmpty()
                if (ultimos.isNotEmpty()) {
                    TituloSeccion(Textos.t(T.panel_ultimos_trofeos))
                    UltimosTrofeos(
                        trofeos = ultimos,
                        onClick = { navController.navigate(Screen.GameDetail.routeFor(it.gameId, it.trophyId)) },
                        modifier = Modifier.padding(horizontal = 20.dp),
                    )
                }

                // Lo secundario: cerrojo de hitos, meta de platinos y rival.
                Column(modifier = Modifier.padding(horizontal = 20.dp).padding(top = 28.dp)) {
                    hito?.let { h ->
                        MilestoneBanner(hito = h, onClick = { navController.navigate(Screen.GameDetail.routeFor(h.gameId)) })
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                    GoalBanner(
                        currentPlatinums = globalStats.platinums,
                        targetPlatinums = themeStore.targetPlatinums,
                        onSetTarget = { themeStore.setTargetPlatinums(it) },
                    )
                    if (themeStore.rivalHandle != null) {
                        (rivalComparison as? CompareResult.Ok)?.let { result ->
                            Spacer(modifier = Modifier.height(12.dp))
                            RivalBanner(
                                rival = result.data.them,
                                me = result.data.me,
                                onClick = { navController.navigate(Screen.Compare.routeFor(themeStore.rivalHandle!!)) },
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(32.dp))
                }
            } }
        }
    }

        if (showConfetti) {
            ConfettiOverlay(modifier = Modifier.fillMaxSize())
        }
    }
}


/** Banner del Cerrojo de Hitos: qué juego está reservado para tu próximo platino en número redondo. */
@Composable
fun MilestoneBanner(hito: HitoReservado, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(radio(16)))
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
            .premiumClickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = Textos.t(T.panel_cerrojo), color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Text(
                text = Textos.t(T.panel_cerrojo_texto, hito.titulo, hito.numero),
                color = Foreground,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

@Composable
fun GoalBanner(currentPlatinums: Int, targetPlatinums: Int?, onSetTarget: (Int?) -> Unit) {
    var showDialog by remember { mutableStateOf(false) }

    if (showDialog) {
        var input by remember { mutableStateOf(targetPlatinums?.toString() ?: "") }
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text(Textos.t(T.panel_meta_titulo), color = Foreground) },
            text = {
                OutlinedTextField(
                    value = input,
                    onValueChange = { if (it.all { char -> char.isDigit() }) input = it },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    placeholder = { Text(Textos.t(T.panel_meta_ph), color = Muted) }
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    val value = input.toIntOrNull()
                    if (value != null && value > 0) {
                        onSetTarget(value)
                    } else {
                        onSetTarget(null)
                    }
                    showDialog = false
                }) {
                    Text(Textos.t(T.comun_guardar), color = Accent)
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    onSetTarget(null)
                    showDialog = false
                }) {
                    Text(Textos.t(T.panel_meta_eliminar), color = Danger)
                }
            },
            containerColor = Surface,
            titleContentColor = Foreground
        )
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(radio(16)))
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
            .premiumClickable { showDialog = true }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = Textos.t(T.panel_meta), color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            if (targetPlatinums == null) {
                Text(
                    text = Textos.t(T.panel_meta_fijar),
                    color = Foreground,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 4.dp),
                )
            } else {
                val progress = currentPlatinums.toFloat() / targetPlatinums.toFloat()
                Text(
                    text = Textos.t(T.panel_meta_objetivo, targetPlatinums),
                    color = Foreground,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 4.dp),
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .height(8.dp)
                        .background(Background, RoundedCornerShape(radio(4))),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progress.coerceIn(0f, 1f))
                            .fillMaxHeight()
                            .background(Accent, RoundedCornerShape(radio(4))),
                    )
                }
                Text(text = "$currentPlatinums / $targetPlatinums", color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}

@Composable
fun RivalBanner(rival: CompareSide, me: CompareSide, onClick: () -> Unit) {
    val winning = me.platinos >= rival.platinos
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (winning) Accent.copy(alpha=0.1f) else Surface, RoundedCornerShape(radio(16)))
            .border(1.dp, if (winning) Accent else Border, RoundedCornerShape(radio(16)))
            .premiumClickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = Textos.t(T.panel_rival), color = Danger, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Text(
                text = Textos.t(T.panel_rival_texto, me.platinos, rival.name, rival.platinos),
                color = Foreground,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
        Icon(androidx.compose.material.icons.Icons.Default.ArrowForward, contentDescription = null, tint = Muted)
    }
}

