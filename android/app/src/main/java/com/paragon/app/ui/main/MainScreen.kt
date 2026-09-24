package com.paragon.app.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.geometry.Offset
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CenterFocusStrong
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.paragon.app.ComposeMainActivity
import com.paragon.app.data.GlobalStats
import com.paragon.app.data.PanelRepository
import com.paragon.app.data.RachaGlobal
import com.paragon.app.data.SettingsRepository
import com.paragon.app.data.UserProfile
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.collections.CollectionsScreen
import com.paragon.app.ui.compare.CompareScreen
import com.paragon.app.ui.stuck.StuckTrophiesScreen
import com.paragon.app.ui.feed.FeedScreen
import com.paragon.app.ui.focus.FocusScreen
import com.paragon.app.ui.game.GameDetailScreen
import com.paragon.app.ui.library.LibraryScreen
import com.paragon.app.ui.navigation.Screen
import com.paragon.app.ui.panel.PanelScreen
import com.paragon.app.ui.panel.RachaSheet
import com.paragon.app.ui.social.SocialScreen
import com.paragon.app.ui.settings.SettingsScreen
import com.paragon.app.ui.settings.LinkedAccountsScreen
import com.paragon.app.ui.stats.StatsScreen
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Gold
import com.paragon.app.ui.theme.Muted

// Definimos la estructura de items de navegación
sealed class BottomNavItem(val screen: Screen, val icon: ImageVector) {
    object Dashboard : BottomNavItem(Screen.Dashboard, Icons.Default.Home)
    object Library : BottomNavItem(Screen.Library, Icons.AutoMirrored.Filled.List)
    object Stats : BottomNavItem(Screen.Stats, Icons.Default.BarChart)
    object Feed : BottomNavItem(Screen.Feed, Icons.Default.Groups)
    object Social : BottomNavItem(Screen.Social, Icons.Default.EmojiEvents)
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun MainScreen(
    tokenStore: TokenStore,
    themeStore: com.paragon.app.data.theme.ThemeStore,
    profile: UserProfile,
    stats: GlobalStats,
    racha: RachaGlobal,
    panelFromCache: Boolean = false,
) {
    val navController = rememberNavController()
    // La lupa de la barra superior solo busca en Biblioteca (`searchQuery`
    // más abajo nunca se pasa a ninguna otra pantalla) — se muestra solo
    // ahí para no dejar un botón que no hace nada en el resto de pestañas.
    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
    val isOnLibrary = currentRoute == Screen.Library.route
    var isSearchActive by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    androidx.compose.runtime.LaunchedEffect(isOnLibrary) {
        if (!isOnLibrary) {
            isSearchActive = false
            searchQuery = ""
        }
    }
    var isMenuExpanded by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val coroutineScope = rememberCoroutineScope()
    var bottomBarVisible by rememberSaveable { mutableStateOf(true) }
    var showRachaSheet by remember { mutableStateOf(false) }

    val nestedScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (available.y < -15f) { // Scrolling down
                    bottomBarVisible = false
                } else if (available.y > 15f) { // Scrolling up
                    bottomBarVisible = true
                }
                return Offset.Zero
            }
        }
    }

    val items = if (themeStore.zenMode) {
        listOf(
            BottomNavItem.Dashboard,
            BottomNavItem.Library,
            BottomNavItem.Stats
        )
    } else {
        listOf(
            BottomNavItem.Dashboard,
            BottomNavItem.Library,
            BottomNavItem.Stats,
            BottomNavItem.Feed,
            BottomNavItem.Social
        )
    }

    Scaffold(
        modifier = Modifier.nestedScroll(nestedScrollConnection),
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Background)
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isSearchActive && isOnLibrary) {
                    TextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Buscar juego...", color = Muted) },
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Background,
                            unfocusedContainerColor = Background,
                            focusedTextColor = Foreground,
                            unfocusedTextColor = Foreground,
                            cursorColor = Accent,
                            focusedIndicatorColor = Accent,
                            unfocusedIndicatorColor = Border
                        ),
                        singleLine = true
                    )
                    IconButton(onClick = { 
                        isSearchActive = false
                        searchQuery = "" 
                    }) {
                        Icon(Icons.Default.Close, contentDescription = "Cerrar búsqueda", tint = Foreground)
                    }
                } else {
                    ParagonWordmark()
                    Spacer(Modifier.weight(1f))
                    StreakChip(racha = racha, onClick = { showRachaSheet = true })
                    if (isOnLibrary) {
                        IconButton(onClick = { isSearchActive = true }) {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = "Buscar",
                                tint = Foreground
                            )
                        }
                    }
                    Box {
                        IconButton(onClick = { isMenuExpanded = true }) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .background(com.paragon.app.ui.theme.AccentSoft, RoundedCornerShape(16.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                // Misma foto que la web (`resolveAvatarUrl`, ver
                                // API-CONTRACT.md) si el perfil ya tiene una —
                                // solo cae a la inicial cuando no hay ninguna.
                                if (!profile.image.isNullOrBlank()) {
                                    coil3.compose.AsyncImage(
                                        model = profile.image,
                                        contentDescription = null,
                                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(RoundedCornerShape(16.dp)),
                                    )
                                } else {
                                    Text(profile.name.take(1).uppercase(), color = Accent, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                        DropdownMenu(
                            expanded = isMenuExpanded,
                            onDismissRequest = { isMenuExpanded = false },
                            // Antes era el menú desplegable genérico de
                            // Material sin más (fondo plano, texto suelto
                            // sin iconos, "Ajustes" mezclado con accesos
                            // directos como si fuera uno más) — borde +
                            // esquinas propias de la app, un icono por
                            // opción, y "Ajustes" separado por un divisor
                            // porque es la única que no es un atajo a una
                            // función, es la puerta a toda una sección.
                            modifier = Modifier
                                .background(com.paragon.app.ui.theme.Surface, RoundedCornerShape(14.dp))
                                .border(1.dp, com.paragon.app.ui.theme.Border, RoundedCornerShape(14.dp))
                                .width(220.dp)
                        ) {
                            HeaderMenuItem(
                                icon = Icons.Default.CenterFocusStrong,
                                label = "Modo Enfoque",
                                onClick = {
                                    isMenuExpanded = false
                                    navController.navigate(Screen.Focus.route)
                                }
                            )
                            HeaderMenuItem(
                                icon = Icons.AutoMirrored.Filled.CompareArrows,
                                label = "Comparar",
                                onClick = {
                                    isMenuExpanded = false
                                    navController.navigate("compare")
                                }
                            )
                            HeaderMenuItem(
                                icon = Icons.Default.Folder,
                                label = "Carpetas",
                                onClick = {
                                    isMenuExpanded = false
                                    navController.navigate(Screen.Collections.route)
                                }
                            )
                            HeaderMenuItem(
                                icon = Icons.Default.Star,
                                label = "Trofeos Atascados",
                                onClick = {
                                    isMenuExpanded = false
                                    navController.navigate(Screen.StuckTrophies.route)
                                }
                            )
                            HorizontalDivider(color = Border, modifier = Modifier.padding(vertical = 4.dp))
                            HeaderMenuItem(
                                icon = Icons.Default.Settings,
                                label = "Ajustes",
                                iconTint = Accent,
                                onClick = {
                                    isMenuExpanded = false
                                    navController.navigate(Screen.Settings.route)
                                }
                            )
                        }
                    }
                }
            }
        },
        bottomBar = {
            AnimatedVisibility(
                visible = bottomBarVisible,
                enter = slideInVertically(initialOffsetY = { it }),
                exit = slideOutVertically(targetOffsetY = { it })
            ) {
                NavigationBar(
                    containerColor = Background,
                    contentColor = Foreground,
                    modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars),
                ) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination

                items.forEach { item ->
                    NavigationBarItem(
                        // Sin `label`: con 5 pestañas, textos como "Estadísticas"
                        // o "Comunidad" no caben y se cortan — mejor solo el
                        // icono (más grande, para que siga siendo legible) con
                        // `contentDescription` para accesibilidad.
                        icon = { Icon(item.icon, contentDescription = item.screen.title, modifier = Modifier.size(26.dp)) },
                        selected = currentDestination?.hierarchy?.any { it.route == item.screen.route } == true,
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            // `saveState`/`restoreState` (quitados a propósito):
                            // esos dos son justo lo que hacía que tocar una
                            // pestaña de abajo resucitara la pantalla que
                            // hubiera quedado a medias ahí la última vez (p.
                            // ej. Ajustes, abierto desde el menú de Inicio),
                            // en vez de llevar siempre a la raíz de esa
                            // pestaña — que es lo que se pidió de verdad.
                            navController.navigate(item.screen.route) {
                                popUpTo(navController.graph.findStartDestination().id)
                                launchSingleTop = true
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Accent,
                            unselectedIconColor = Muted,
                            selectedTextColor = Accent,
                            unselectedTextColor = Muted,
                            indicatorColor = Background // Quitamos la pastilla redondeada por defecto
                        )
                    )
                }
            }
        }
    }
    ) { innerPadding ->
        // SharedTransitionLayout envuelve TODO el NavHost (no solo Biblioteca/
        // Ficha) porque la Ficha de juego se abre también desde el Panel,
        // Comunidad, Ligas y Carpetas — todas necesitan compartir el mismo
        // SharedTransitionScope para que la carátula pueda "volar" cuando SÍ
        // hay una tarjeta de origen con la misma clave (Biblioteca), y
        // simplemente no anime cuando no la hay (resto de orígenes).
        SharedTransitionLayout {
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier.padding(innerPadding),
            enterTransition = { androidx.compose.animation.fadeIn(animationSpec = androidx.compose.animation.core.tween(300)) },
            exitTransition = { androidx.compose.animation.fadeOut(animationSpec = androidx.compose.animation.core.tween(300)) },
            popEnterTransition = { androidx.compose.animation.fadeIn(animationSpec = androidx.compose.animation.core.tween(300)) },
            popExitTransition = { androidx.compose.animation.fadeOut(animationSpec = androidx.compose.animation.core.tween(300)) }
        ) {
            composable(Screen.Dashboard.route) { PanelScreen(navController, tokenStore, themeStore, profile, stats, panelFromCache) }
            composable(Screen.Library.route) {
                LibraryScreen(
                    navController = navController,
                    tokenStore = tokenStore,
                    themeStore = themeStore,
                    searchQuery = searchQuery,
                    sharedTransitionScope = this@SharedTransitionLayout,
                    animatedVisibilityScope = this,
                )
            }
            composable(Screen.Stats.route) { StatsScreen(tokenStore, handle = profile.handle) }
            composable(Screen.Feed.route) { 
                FeedScreen(tokenStore, themeStore, onCompareClick = { handle ->
                    navController.navigate(Screen.Compare.routeFor(handle))
                }) 
            }
            composable(Screen.Social.route) {
                SocialScreen(tokenStore, themeStore, myHandle = profile.handle, onCompareClick = { handle ->
                    navController.navigate(Screen.Compare.routeFor(handle))
                })
            }

            composable(Screen.Focus.route) {
                FocusScreen(tokenStore, onBack = { navController.popBackStack() })
            }
            composable(
                route = Screen.Compare.route,
                arguments = listOf(navArgument("handle") { nullable = true; defaultValue = null })
            ) { backStackEntry ->
                val initialHandle = backStackEntry.arguments?.getString("handle")
                CompareScreen(tokenStore, initialHandle = initialHandle, onBack = { navController.popBackStack() })
            }
            composable(Screen.Collections.route) {
                CollectionsScreen(navController, tokenStore, onBack = { navController.popBackStack() })
            }
            composable(Screen.StuckTrophies.route) {
                StuckTrophiesScreen(tokenStore, onBack = { navController.popBackStack() })
            }
            
            // Pantallas de Ajustes
            composable(Screen.Settings.route) {
                SettingsScreen(
                    profile = profile,
                    repository = remember { SettingsRepository(tokenStore) },
                    themeStore = themeStore,
                    onBack = { navController.popBackStack() },
                    onNavigateToLinkedAccounts = { navController.navigate(Screen.LinkedAccounts.route) },
                    onLogout = {
                        // Cierra sesión SOLO en este móvil (mintMobileSession
                        // en el backend le da a la app un sessionToken propio,
                        // ya no la cookie prestada del navegador) — no toca
                        // ninguna sesión web. Si falla la llamada de red, se
                        // borra el token local igualmente: PanelRepository.
                        // logout() ya se traga ese error.
                        coroutineScope.launch {
                            PanelRepository(tokenStore).logout()
                            tokenStore.clear()
                            (context as? ComposeMainActivity)?.recreate()
                        }
                    }
                )
            }
            composable(Screen.LinkedAccounts.route) {
                LinkedAccountsScreen(
                    repository = remember { SettingsRepository(tokenStore) },
                    onBack = { navController.popBackStack() }
                )
            }

            // Ficha de Juego
            composable(
                route = Screen.GameDetail.route,
                arguments = listOf(navArgument("gameId") { type = NavType.StringType }),
            ) { backStackEntry ->
                val gameId = backStackEntry.arguments?.getString("gameId") ?: return@composable
                GameDetailScreen(
                    gameId = gameId,
                    tokenStore = tokenStore,
                    handle = profile.handle,
                    onBack = { navController.popBackStack() },
                    sharedTransitionScope = this@SharedTransitionLayout,
                    animatedVisibilityScope = this,
                )
            }
        }
        }
    }

    if (showRachaSheet) {
        RachaSheet(tokenStore = tokenStore, onDismiss = { showRachaSheet = false })
    }
}

@Composable
private fun HeaderMenuItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
    iconTint: Color = Muted,
) {
    DropdownMenuItem(
        text = { Text(label, color = Foreground, fontSize = 14.sp) },
        leadingIcon = { Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(20.dp)) },
        onClick = onClick,
    )
}

/**
 * Marca de Paragon para la cabecera — antes era una `P` dentro de un
 * cuadrado (y antes de eso, solo texto plano), que no dice nada de la app
 * por sí sola. Reutiliza el MISMO símbolo (`ParagonMark`: gema facetada +
 * flecha ascendente) que la pantalla de login, en miniatura — marca
 * consistente en toda la app, un solo sitio donde vive el dibujo.
 */
@Composable
private fun ParagonWordmark() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        com.paragon.app.ui.common.ParagonMark(modifier = Modifier.size(22.dp))
        Text(
            text = "PARAGON",
            color = Foreground,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 2.sp,
            modifier = Modifier.padding(start = 9.dp),
        )
    }
}

/**
 * Racha diaria estilo Duolingo (idea #7 del brainstorm de v1.0) — dato ya
 * existía en `GET /api/mobile/stats` (`RachasCard` en `StatsScreen.kt`),
 * pero enterrado en una pestaña que casi nadie abre a diario. Este chip la
 * saca a la cabecera, visible en las 5 pestañas de la barra inferior, para
 * que el usuario la vea cada vez que abre la app. Toca para ir a
 * Estadísticas, donde ya está el desglose completo (mejor racha, días
 * activos).
 */
@Composable
private fun StreakChip(racha: RachaGlobal, onClick: () -> Unit) {
    val viva = racha.actual > 0
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable { onClick() }
            .background(if (viva) Gold.copy(alpha = 0.14f) else Color.Transparent)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Default.Whatshot,
            contentDescription = if (viva) "Racha de ${racha.actual} días" else "Sin racha activa",
            tint = if (viva) Gold else Muted,
            modifier = Modifier.size(20.dp),
        )
        Text(
            text = racha.actual.toString(),
            color = if (viva) Gold else Muted,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(start = 4.dp),
        )
    }
}
