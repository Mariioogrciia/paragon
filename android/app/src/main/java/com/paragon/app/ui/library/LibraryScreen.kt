package com.paragon.app.ui.library

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.navigation.NavController
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import com.paragon.app.data.LibraryFilter
import com.paragon.app.data.LibraryRepository
import com.paragon.app.data.LibraryResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.filterByStatus
import com.paragon.app.ui.navigation.Screen
import com.paragon.app.ui.panel.StandardGameCard
import com.paragon.app.ui.panel.HeroGameCard
import com.paragon.app.ui.theme.*
import com.paragon.app.data.theme.ThemeStore
import com.paragon.app.util.rememberShakeListener
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.GridView

private val FILTERS = listOf(
    LibraryFilter.TODOS to "Todos",
    LibraryFilter.JUGANDO to "Jugando",
    LibraryFilter.PLATINADOS to "Platinados",
    LibraryFilter.COMPLETADOS to "Completados",
    LibraryFilter.ABANDONADOS to "Abandonados",
    LibraryFilter.BACKLOG to "Pila Vergüenza",
)

/** Biblioteca real contra GET /api/mobile/library (LibraryRepository). El botón "Ordenar" sigue sin acción — pendiente. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalSharedTransitionApi::class)
@Composable
fun LibraryScreen(
    navController: NavController,
    tokenStore: TokenStore,
    themeStore: ThemeStore,
    searchQuery: String = "",
    sharedTransitionScope: SharedTransitionScope? = null,
    animatedVisibilityScope: AnimatedVisibilityScope? = null,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val db = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context) }
    val repository = remember(tokenStore, db) { LibraryRepository(tokenStore, db.libraryDao(), context) }
    var result by remember { mutableStateOf<LibraryResult?>(null) }
    var selectedFilter by remember { mutableIntStateOf(0) }
    var isSortMenuExpanded by remember { mutableStateOf(false) }
    var sortOption by remember { mutableIntStateOf(0) } // 0: Progreso, 1: Título A-Z, 2: Título Z-A
    val sortLabels = listOf("Progreso", "Título A-Z", "Título Z-A")
    val retryCounter = remember { mutableIntStateOf(0) }
    val haptic = LocalHapticFeedback.current

    var isInitialLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    var showRoulette by remember { mutableStateOf(false) }

    LaunchedEffect(retryCounter.value) {
        if (result == null) isInitialLoading = true
        result = repository.getLibrary()
        isInitialLoading = false
        isRefreshing = false
    }

    // "Agitar para jugar": juegos al 0% (backlog sin empezar) — el mismo
    // gesto no tiene sentido con la ruleta ya abierta, de ahí `!showRoulette`
    // en `enabled` en vez de comprobarlo solo dentro del callback.
    val backlogGames = (result as? LibraryResult.Ok)?.games?.filter { it.progressPercent == 0 } ?: emptyList()
    rememberShakeListener(enabled = backlogGames.isNotEmpty() && !showRoulette) {
        showRoulette = true
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Background)
        ) {
        // Cabecera con selector
        Column(modifier = Modifier.padding(start = 24.dp, end = 24.dp, top = 16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "BIBLIOTECA",
                    color = Foreground,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold
                )

                // Botón real de orden con DropdownMenu
                Box {
                    TextButton(onClick = { isSortMenuExpanded = true }) {
                        Text(text = sortLabels[sortOption], color = Muted, fontSize = 14.sp)
                        Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Muted)
                    }
                    DropdownMenu(
                        expanded = isSortMenuExpanded,
                        onDismissRequest = { isSortMenuExpanded = false },
                        modifier = Modifier.background(Surface)
                    ) {
                        sortLabels.forEachIndexed { index, label ->
                            DropdownMenuItem(
                                text = { Text(label, color = Foreground) },
                                onClick = {
                                    sortOption = index
                                    isSortMenuExpanded = false
                                }
                            )
                        }
                    }
                }
                
                // Toggle Vista (Grid / Lista)
                IconButton(onClick = { 
                    themeStore.setLibraryLayout(if (themeStore.libraryLayout == 0) 1 else 0) 
                }) {
                    Icon(
                        if (themeStore.libraryLayout == 0) Icons.AutoMirrored.Filled.List else Icons.Default.GridView,
                        contentDescription = "Cambiar Vista",
                        tint = Muted
                    )
                }
            }

            if ((result as? LibraryResult.Ok)?.fromCache == true) {
                Text(
                    text = "Sin conexión — mostrando la última copia guardada",
                    color = Muted,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            ScrollableTabRow(
                selectedTabIndex = selectedFilter,
                containerColor = Background,
                contentColor = Accent,
                divider = { HorizontalDivider(color = Border) },
                edgePadding = 0.dp
            ) {
                FILTERS.forEachIndexed { index, (_, title) ->
                    Tab(
                        selected = selectedFilter == index,
                        onClick = { 
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            selectedFilter = index 
                        },
                        text = { Text(text = title, fontWeight = FontWeight.Bold) },
                        selectedContentColor = Accent,
                        unselectedContentColor = Muted
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        when (val current = result) {
            null -> {
                if (isInitialLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Accent)
                    }
                }
            }
            is LibraryResult.Error -> Box(
                modifier = Modifier.fillMaxSize().padding(24.dp),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = current.message, color = Foreground, fontSize = 14.sp)
                    Button(
                        onClick = { retryCounter.value += 1 },
                        modifier = Modifier.padding(top = 16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Accent),
                    ) {
                        Text("Reintentar")
                    }
                }
            }
            is LibraryResult.Ok -> {
                // Aplicar filtros, búsqueda y ordenación
                val games = current.games
                    .filterByStatus(FILTERS[selectedFilter].first)
                    .filter { if (searchQuery.isBlank()) true else it.title.contains(searchQuery, ignoreCase = true) }
                    .let { list ->
                        when (sortOption) {
                            0 -> list.sortedByDescending { it.progressPercent }
                            1 -> list.sortedBy { it.title }
                            2 -> list.sortedByDescending { it.title }
                            else -> list
                        }
                    }

                if (games.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = "Nada por aquí todavía.", color = Muted, fontSize = 14.sp)
                    }
                } else {
                    val isList = themeStore.libraryLayout == 1
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(if (isList) 1 else 2),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
                        contentPadding = PaddingValues(bottom = 32.dp)
                    ) {
                        items(games) { game ->
                            if (isList) {
                                HeroGameCard(
                                    game = game.toGameProgress(),
                                    onClick = { navController.navigate(Screen.GameDetail.routeFor(game.id)) }
                                )
                            } else {
                                StandardGameCard(
                                    game = game.toGameProgress(),
                                    onClick = { navController.navigate(Screen.GameDetail.routeFor(game.id)) },
                                    sharedTransitionScope = sharedTransitionScope,
                                    animatedVisibilityScope = animatedVisibilityScope,
                                )
                            }
                        }
                    }
                }
            }
        }
        }
    }

        if (showRoulette && backlogGames.isNotEmpty()) {
            ShakeRouletteOverlay(
                candidates = backlogGames,
                onDismiss = { showRoulette = false },
                onOpenGame = { gameId ->
                    showRoulette = false
                    navController.navigate(Screen.GameDetail.routeFor(gameId))
                },
            )
        }
    }
}
