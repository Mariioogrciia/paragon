package com.paragon.app.ui.panel

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
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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

/**
 * `userProfile`/`globalStats` ya son reales (bajan desde AppRoot vía
 * MainScreen — /api/mobile/panel). "A un paso del platino"/"recientes" ya
 * son reales también (/api/mobile/panel/highlights, mismo cálculo que la
 * portada web). El desglose por metal (`trophyCounts`) sigue con
 * `PanelRepository.getMockTrophyCounts()`: no hay endpoint todavía para eso.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PanelScreen(navController: NavController, tokenStore: TokenStore, userProfile: UserProfile, globalStats: GlobalStats) {
    val repository = remember(tokenStore) { PanelRepository(tokenStore) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val db = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context) }
    val libraryRepository = remember(tokenStore, db) { LibraryRepository(tokenStore, db.libraryDao(), context) }
    val milestoneRepository = remember(tokenStore) { MilestoneRepository(tokenStore) }
    val trophyCounts = remember { repository.getMockTrophyCounts() }
    var highlights by remember { mutableStateOf<HighlightsResult?>(null) }
    var pinnedGame by remember { mutableStateOf<LibraryGame?>(null) }
    var hito by remember { mutableStateOf<HitoReservado?>(null) }
    
    val haptic = LocalHapticFeedback.current
    val retryCounter = remember { mutableIntStateOf(0) }
    val pullToRefreshState = rememberPullToRefreshState()
    var isInitialLoading by remember { mutableStateOf(true) }

    LaunchedEffect(retryCounter.value) {
        if (highlights == null) isInitialLoading = true
        coroutineScope {
            launch { highlights = repository.getHighlights() }
            launch { pinnedGame = libraryRepository.findPinnedGame() }
            launch { hito = (milestoneRepository.getMilestone() as? MilestoneResult.Ok)?.hito }
        }
        isInitialLoading = false
        pullToRefreshState.endRefresh()
    }
    
    if (pullToRefreshState.isRefreshing) {
        LaunchedEffect(true) {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            retryCounter.value += 1
        }
    }

    Box(modifier = Modifier.fillMaxSize().nestedScroll(pullToRefreshState.nestedScrollConnection)) {
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
                        Spacer(modifier = Modifier.height(24.dp))
                    }

                    // Resumen Stats
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.heightIn(max = 300.dp) // Constraint para LazyGrid dentro de LazyColumn
                    ) {
                        item { PlatinumStatTile(globalStats.platinums) }
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
        
        PullToRefreshContainer(
            state = pullToRefreshState,
            modifier = Modifier.align(Alignment.TopCenter),
            containerColor = Surface,
            contentColor = Accent
        )
    }
}

@Composable
fun PlatinumStatTile(value: Int) {
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
