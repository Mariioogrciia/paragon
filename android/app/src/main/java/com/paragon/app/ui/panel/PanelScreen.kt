package com.paragon.app.ui.panel

import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.filled.ArrowForward
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
import com.paragon.app.data.UserProfile
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.navigation.Screen
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import coil3.compose.AsyncImage
import com.paragon.app.data.theme.ThemeStore

/**
 * `userProfile`/`globalStats` ya son reales (bajan desde AppRoot vía
 * MainScreen — /api/mobile/panel). "A un paso del platino"/"recientes" ya
 * son reales también (/api/mobile/panel/highlights, mismo cálculo que la
 * portada web). El desglose por metal (`trophyCounts`) sigue con
 * `PanelRepository.getMockTrophyCounts()`: no hay endpoint todavía para eso.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalSharedTransitionApi::class)
@Composable
fun PanelScreen(navController: NavController, tokenStore: TokenStore, themeStore: ThemeStore, userProfile: UserProfile, globalStats: GlobalStats) {
    val repository = remember(tokenStore) { PanelRepository(tokenStore) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val db = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context) }
    val libraryRepository = remember(tokenStore, db) { LibraryRepository(tokenStore, db.libraryDao(), context) }
    val milestoneRepository = remember(tokenStore) { MilestoneRepository(tokenStore) }
    val compareRepository = remember(tokenStore) { CompareRepository(tokenStore) }
    val trophyCounts = remember { repository.getMockTrophyCounts() }
    var highlights by remember { mutableStateOf<HighlightsResult?>(null) }
    var pinnedGame by remember { mutableStateOf<LibraryGame?>(null) }
    var hito by remember { mutableStateOf<HitoReservado?>(null) }
    var rivalComparison by remember { mutableStateOf<CompareResult?>(null) }
    
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
            item {
                Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                    // Saludo y nivel
                    Text(
                        text = "HOLA, ${userProfile.name.uppercase()}",
                        color = Foreground,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 16.dp)
                    )

                    Text(
                        text = "Nivel Paragon ${userProfile.level}",
                        color = Muted,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
                    )

                    pinnedGame?.let { game ->
                        PinnedGameBanner(
                            // A la ficha del juego, no directo a Modo Enfoque —
                            // ese es un modo aparte que se elige a propósito
                            // desde el menú, no algo que se cae encima al
                            // tocar tu objetivo actual en el Panel.
                            game = game,
                            onClick = { navController.navigate(Screen.GameDetail.routeFor(game.id)) },
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    hito?.let { h ->
                        MilestoneBanner(
                            hito = h,
                            onClick = { navController.navigate(Screen.GameDetail.routeFor(h.gameId)) },
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    GoalBanner(
                        currentPlatinums = globalStats.platinums,
                        targetPlatinums = themeStore.targetPlatinums,
                        onSetTarget = { themeStore.setTargetPlatinums(it) }
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    if (themeStore.rivalHandle != null) {
                        (rivalComparison as? CompareResult.Ok)?.let { result ->
                            RivalBanner(
                                rival = result.data.them,
                                me = result.data.me,
                                onClick = { navController.navigate(Screen.Compare.routeFor(themeStore.rivalHandle!!)) }
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                        }
                    } else if (hito == null) {
                        // Spacer extra if we have neither milestone nor rival
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // Resumen Stats
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.heightIn(max = 300.dp) // Constraint para LazyGrid dentro de LazyColumn
                    ) {
                        item { PlatinumStatTile(globalStats.platinums, onEasterEgg = { showConfetti = true }) }
                        item { StatTile("Trofeos", globalStats.trophies.toString()) }
                        item { StatTile("Juegos", globalStats.games.toString()) }
                        item { StatTile("Completado", "${globalStats.completionRate}%") }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Desglose de trofeos
                    TrophyCountRow(
                        counts = trophyCounts,
                        summary = "${globalStats.trophies} trofeos en ${globalStats.games} juegos"
                    )

                    Spacer(modifier = Modifier.height(32.dp))

                    // Hero Card (A un paso del platino)
                    Text(
                        text = "A UN PASO DEL PLATINO",
                        color = Foreground,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Lo que menos te queda, ordenado por trofeos pendientes.",
                        color = Muted,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                    )

                    when (val current = highlights) {
                        null -> {
                            if (isInitialLoading) {
                                Box(
                                    modifier = Modifier.fillMaxWidth().height(240.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    CircularProgressIndicator(color = Accent)
                                }
                            }
                        }
                        is HighlightsResult.Error -> Text(
                            text = current.message,
                            color = Muted,
                            fontSize = 13.sp,
                        )
                        is HighlightsResult.Ok -> {
                            val nearest = current.nearPlatinum.firstOrNull()
                            if (nearest != null) {
                                HeroGameCard(
                                    game = nearest,
                                    onClick = { navController.navigate(Screen.GameDetail.routeFor(nearest.id)) },
                                )
                            } else {
                                Text(
                                    text = "Nada a un paso del platino todavía — sigue jugando.",
                                    color = Muted,
                                    fontSize = 13.sp,
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    // Jugado recientemente
                    Text(
                        text = "JUGADO RECIENTEMENTE",
                        color = Foreground,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }
            }

            // Carrusel horizontal
            item {
                val recentGames = (highlights as? HighlightsResult.Ok)?.recent.orEmpty()
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(horizontal = 24.dp)
                ) {
                    items(recentGames) { game ->
                        StandardGameCard(
                            game = game,
                            onClick = { navController.navigate(Screen.GameDetail.routeFor(game.id)) }
                        )
                    }
                }
            }
        }
    }

        if (showConfetti) {
            ConfettiOverlay(modifier = Modifier.fillMaxSize())
        }
    }
}

/**
 * Easter egg: 5 toques seguidos (menos de 1s entre cada uno, si no se
 * reinicia la cuenta) disparan `onEasterEgg` — lluvia de confeti en
 * PanelScreen. `indication = null` porque el ripple de Material sobre un
 * gradiente ya oscuro apenas se ve y aquí distraía más que ayudaba.
 */
@Composable
fun PlatinumStatTile(value: Int, onEasterEgg: () -> Unit = {}) {
    var tapCount by remember { mutableIntStateOf(0) }
    var lastTapAt by remember { mutableLongStateOf(0L) }
    val haptic = LocalHapticFeedback.current

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF14202C),
                        Color(0xFF0D131C)
                    )
                ),
                shape = RoundedCornerShape(20.dp)
            )
            .border(1.dp, Border, RoundedCornerShape(20.dp))
            .clickable(
                indication = null,
                interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
            ) {
                val now = System.currentTimeMillis()
                tapCount = if (now - lastTapAt > 1000) 1 else tapCount + 1
                lastTapAt = now
                if (tapCount >= 5) {
                    tapCount = 0
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onEasterEgg()
                }
            }
            .padding(24.dp)
    ) {
        Column {
            Text(
                text = "PLATINOS",
                color = Platinum,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp
            )
            Text(
                text = value.toString(),
                color = Color(0xFFDFF0F8),
                fontSize = 48.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

private val MilestoneGoldPanel = Color(0xFFE2B53E)

/** Banner de "A por este platino ahora" — el juego anclado (PinGameButton en GameDetailScreen), lleva a Modo Enfoque. */
@Composable
fun PinnedGameBanner(game: LibraryGame, onClick: () -> Unit) {
    val faltan = (game.definedTotal - game.earnedTotal).coerceAtLeast(0)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.horizontalGradient(colors = listOf(MilestoneGoldPanel.copy(alpha = 0.14f), Surface)),
                shape = RoundedCornerShape(16.dp),
            )
            .border(1.dp, MilestoneGoldPanel.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = game.coverUrl,
            contentDescription = null,
            contentScale = androidx.compose.ui.layout.ContentScale.Crop,
            modifier = Modifier.size(56.dp).clip(RoundedCornerShape(12.dp)).background(Surface2),
        )
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = "A POR ESTE PLATINO AHORA", color = MilestoneGoldPanel, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Text(text = game.title, color = Foreground, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 2.dp))
            Text(
                text = "${game.progressPercent}% · ${if (faltan > 0) "faltan $faltan trofeos" else "¡a un paso!"}",
                color = Muted,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

/** Banner del Cerrojo de Hitos: qué juego está reservado para tu próximo platino en número redondo. */
@Composable
fun MilestoneBanner(hito: HitoReservado, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(16.dp))
            .border(1.dp, Border, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = "CERROJO DE HITOS", color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Text(
                text = "${hito.titulo} reservado para tu platino #${hito.numero}",
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
            title = { Text("Meta de Platinos", color = Foreground) },
            text = {
                OutlinedTextField(
                    value = input,
                    onValueChange = { if (it.all { char -> char.isDigit() }) input = it },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    placeholder = { Text("Ej: 50", color = Muted) }
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
                    Text("Guardar", color = Accent)
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    onSetTarget(null)
                    showDialog = false
                }) {
                    Text("Eliminar Meta", color = Danger)
                }
            },
            containerColor = Surface,
            titleContentColor = Foreground
        )
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(16.dp))
            .border(1.dp, Border, RoundedCornerShape(16.dp))
            .clickable { showDialog = true }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = "META PERSONAL", color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            if (targetPlatinums == null) {
                Text(
                    text = "Fijar meta de platinos",
                    color = Foreground,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 4.dp),
                )
            } else {
                val progress = currentPlatinums.toFloat() / targetPlatinums.toFloat()
                Text(
                    text = "Objetivo: $targetPlatinums Platinos",
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
                        .background(Background, RoundedCornerShape(4.dp)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progress.coerceIn(0f, 1f))
                            .fillMaxHeight()
                            .background(Accent, RoundedCornerShape(4.dp)),
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
            .background(if (winning) Accent.copy(alpha=0.1f) else Surface, RoundedCornerShape(16.dp))
            .border(1.dp, if (winning) Accent else Border, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = "RIVAL PRINCIPAL", color = Danger, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Text(
                text = "Tú (${me.platinos}) 🆚 ${rival.name} (${rival.platinos})",
                color = Foreground,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
        Icon(androidx.compose.material.icons.Icons.Default.ArrowForward, contentDescription = null, tint = Muted)
    }
}

@Composable
fun StatTile(label: String, value: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(20.dp))
            .border(1.dp, Border, RoundedCornerShape(20.dp))
            .padding(24.dp)
    ) {
        Column {
            Text(
                text = label.uppercase(),
                color = Muted,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp
            )
            Text(
                text = value,
                color = Foreground,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}
