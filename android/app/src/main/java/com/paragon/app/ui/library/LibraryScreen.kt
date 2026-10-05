package com.paragon.app.ui.library

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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
import androidx.compose.material.icons.filled.Search
import com.paragon.app.R
import androidx.compose.ui.res.stringResource
import com.paragon.app.util.Textos

private val FILTERS get() = listOf(
    LibraryFilter.TODOS to Textos.t(R.string.biblio_todos),
    LibraryFilter.JUGANDO to Textos.t(R.string.biblio_jugando),
    LibraryFilter.PLATINADOS to Textos.t(R.string.biblio_platinados),
    LibraryFilter.PLATINADO_SIN_DLC to Textos.t(R.string.biblio_falta_dlc),
    LibraryFilter.COMPLETADOS to Textos.t(R.string.biblio_completados),
    LibraryFilter.ABANDONADOS to Textos.t(R.string.biblio_abandonados),
    LibraryFilter.BACKLOG to Textos.t(R.string.biblio_pila),
)

/** Biblioteca real contra GET /api/mobile/library (LibraryRepository). */
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
    val sortLabels = listOf(stringResource(R.string.biblio_orden_progreso), stringResource(R.string.biblio_orden_az), stringResource(R.string.biblio_orden_za))
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
        // Cabecera con selector — antes "BIBLIOTECA" (32sp) + el desplegable
        // de orden + el selector de vista iban los tres en la MISMA fila:
        // en un móvil normal no caben, y el texto del desplegable se
        // recortaba a medias ("Progreso" → "rogreso"). El título se lleva
        // su propia fila; orden y vista bajan a una segunda fila con todo
        // el ancho para ellos solos.
        Column(modifier = Modifier.padding(start = 24.dp, end = 24.dp, top = 16.dp)) {
            Text(
                text = stringResource(R.string.biblio_titulo),
                color = Foreground,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Botón real de orden con DropdownMenu
                Box {
                    TextButton(onClick = { isSortMenuExpanded = true }, contentPadding = PaddingValues(0.dp)) {
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

                // Selector de vista — antes era UN icono que cambiaba solo
                // (cuadrícula/lista), sin dejar claro que hay dos formas
                // distintas de ver lo mismo, ni cuál está activa a simple
                // vista. Con las dos opciones siempre visibles y una
                // resaltada queda claro que es una elección, no un botón
                // de "siguiente estilo".
                Row(
                    modifier = Modifier
                        .border(1.dp, Border, RoundedCornerShape(radio(10)))
                        .padding(2.dp),
                ) {
                    listOf(0 to Icons.Default.GridView, 1 to Icons.AutoMirrored.Filled.List).forEach { (layout, icon) ->
                        val selected = themeStore.libraryLayout == layout
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(radio(8)))
                                .background(if (selected) Accent else Color.Transparent)
                                .clickable { themeStore.setLibraryLayout(layout) }
                                .padding(8.dp),
                        ) {
                            Icon(
                                icon,
                                contentDescription = if (layout == 0) stringResource(R.string.biblio_vista_cuadricula) else stringResource(R.string.biblio_vista_enfoque),
                                tint = if (selected) OnAccent else Muted,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }
                }
            }

            if ((result as? LibraryResult.Ok)?.fromCache == true) {
                Text(
                    text = stringResource(R.string.comun_sin_conexion_copia),
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
                    com.paragon.app.ui.common.EsqueletoLista()
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
                        Text(stringResource(R.string.comun_reintentar))
                    }
                }
            }
            is LibraryResult.Ok -> {
                // Aplicar filtros, búsqueda y ordenación — memoizado: antes
                // se recalculaba en CADA recomposición (p. ej. al escribir
                // en el buscador letra a letra, o por el chip de racha de
                // la cabecera), volviendo a filtrar/ordenar la biblioteca
                // entera sin que nada relevante hubiera cambiado.
                val games = remember(current.games, selectedFilter, searchQuery, sortOption) {
                    current.games
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
                }

                if (games.isEmpty()) {
                    // Mismo componente que Carpetas/Amigos/Ligas/Comunidad
                    // (ui/common/EmptyState.kt) — antes esta pantalla se
                    // quedaba fuera con un `Text` suelto sin icono ni
                    // contexto, pese a ser una de las 5 pestañas
                    // principales. Copia distinta según si el hueco es "no
                    // tienes nada" o "nada con este filtro/búsqueda".
                    val hayFiltroActivo = searchQuery.isNotBlank() || selectedFilter != 0
                    com.paragon.app.ui.common.EmptyState(
                        icon = if (hayFiltroActivo) Icons.Default.Search else Icons.AutoMirrored.Filled.List,
                        title = if (hayFiltroActivo) stringResource(R.string.biblio_nada_filtros) else stringResource(R.string.biblio_vacia),
                        description = if (hayFiltroActivo) {
                            stringResource(R.string.biblio_nada_filtros_sub)
                        } else {
                            stringResource(R.string.biblio_vacia_sub)
                        },
                    )
                } else {
                    val isList = themeStore.libraryLayout == 1
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(if (isList) 1 else 2),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
                        contentPadding = PaddingValues(bottom = 32.dp)
                    ) {
                        items(games, key = { it.id }) { game ->
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
