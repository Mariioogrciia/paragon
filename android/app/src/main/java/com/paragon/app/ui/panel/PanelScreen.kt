package com.paragon.app.ui.panel

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.paragon.app.data.GlobalStats
import com.paragon.app.data.HighlightsResult
import com.paragon.app.data.PanelRepository
import com.paragon.app.data.UserProfile
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.navigation.Screen
import com.paragon.app.ui.theme.*

/**
 * `userProfile`/`globalStats` ya son reales (bajan desde AppRoot vía
 * MainScreen — /api/mobile/panel). "A un paso del platino"/"recientes" ya
 * son reales también (/api/mobile/panel/highlights, mismo cálculo que la
 * portada web). El desglose por metal (`trophyCounts`) sigue con
 * `PanelRepository.getMockTrophyCounts()`: no hay endpoint todavía para eso.
 */
@Composable
fun PanelScreen(navController: NavController, tokenStore: TokenStore, userProfile: UserProfile, globalStats: GlobalStats) {
    val repository = remember(tokenStore) { PanelRepository(tokenStore) }
    val trophyCounts = remember { repository.getMockTrophyCounts() }
    var highlights by remember { mutableStateOf<HighlightsResult?>(null) }

    LaunchedEffect(Unit) {
        highlights = repository.getHighlights()
    }

    Scaffold(
        containerColor = Background
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
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
                        null -> Box(
                            modifier = Modifier.fillMaxWidth().height(240.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            CircularProgressIndicator(color = Accent)
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
