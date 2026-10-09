package com.paragon.app.ui.main

import androidx.compose.animation.animateContentSize
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.filled.GridView
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.core.tween
import androidx.savedstate.read

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
import androidx.compose.material.icons.filled.Person
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
import androidx.compose.ui.draw.shadow
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Arrangement
import com.paragon.shared.contextoPlataforma
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
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import com.paragon.app.ui.theme.radio

// Definimos la estructura de items de navegación
// `icon` relleno para la pestaña activa e `iconoInactivo` de contorno, como
// la barra de Instagram (6 oct 2026).
sealed class BottomNavItem(val screen: Screen, val icon: ImageVector, val iconoInactivo: ImageVector) {
    object Dashboard : BottomNavItem(Screen.Dashboard, Icons.Filled.Home, Icons.Outlined.Home)
    object Library : BottomNavItem(Screen.Library, Icons.Filled.GridView, Icons.Outlined.GridView)
    object Feed : BottomNavItem(Screen.Feed, Icons.Filled.Groups, Icons.Outlined.Groups)
    object Ligas : BottomNavItem(Screen.Social, Icons.Filled.EmojiEvents, Icons.Outlined.EmojiEvents)
    object Perfil : BottomNavItem(Screen.Perfil, Icons.Filled.Person, Icons.Outlined.Person)
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
    database: com.paragon.app.data.local.ParagonDatabase,
    onLogout: () -> Unit
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
            BottomNavItem.Feed,
            BottomNavItem.Perfil
        )
    } else {
        listOf(
            BottomNavItem.Dashboard,
            BottomNavItem.Library,
            BottomNavItem.Feed,
            BottomNavItem.Ligas,
            BottomNavItem.Perfil
        )
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val anchoAmplio = maxWidth >= 600.dp
    val navBackStackEntryActual by navController.currentBackStackEntryAsState()
    fun irA(item: BottomNavItem) {
        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        // `saveState`/`restoreState` (quitados a propósito): esos dos son
        // justo lo que hacía que tocar una pestaña resucitara la pantalla que
        // hubiera quedado a medias ahí la última vez (p. ej. Ajustes, abierto
        // desde el menú de Inicio), en vez de llevar siempre a la raíz de esa
        // pestaña — que es lo que se pidió de verdad.
        navController.navigate(item.screen.route) {
            popUpTo(navController.graph.findStartDestination().id)
            launchSingleTop = true
        }
    }
    fun estaEn(item: BottomNavItem) =
        navBackStackEntryActual?.destination?.hierarchy?.any { it.route == item.screen.route } == true

    Scaffold(
        // Barra de abajo fija, como Instagram (6 oct 2026): siempre visible,
        // de lado a lado y solo iconos. Ya no se esconde al hacer scroll (eso
        // recolocaba la pantalla y daba un tirón al llegar arriba o abajo).
        bottomBar = {
            if (!anchoAmplio) BarraInferior(items = items, estaEn = { estaEn(it) }, foto = profile.image, inicial = profile.name.take(1), onClick = { irA(it) })
        },
        topBar = {
            // Sin barra "PARAGON" encima (diseño v2, 5 oct 2026): cada pantalla
            // lleva su propia cabecera nativa (CabeceraNativa), como una app de
            // verdad. Aquí solo se reserva la barra de estado.
            Spacer(Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars))
        },
    ) { innerPadding ->
        Box(Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding)
                // El teclado empuja el contenido en vez de tapar el campo
                // que se está escribiendo (comentarios, notas, búsqueda...).
                .imePadding(),
        ) {
        if (anchoAmplio) {
            NavigationRail(
                containerColor = Background,
                contentColor = Foreground,
                modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars.only(WindowInsetsSides.Start)),
            ) {
                Spacer(Modifier.height(8.dp))
                items.forEach { item ->
                    NavigationRailItem(
                        icon = { Icon(item.icon, contentDescription = null, modifier = Modifier.size(24.dp)) },
                        // En el rail sí caben las etiquetas (en la barra de abajo no).
                        label = { Text(item.screen.title, maxLines = 1) },
                        selected = estaEn(item),
                        onClick = { irA(item) },
                        colors = NavigationRailItemDefaults.colors(
                            selectedIconColor = Accent,
                            unselectedIconColor = Muted,
                            selectedTextColor = Accent,
                            unselectedTextColor = Muted,
                            indicatorColor = com.paragon.app.ui.theme.AccentSoft,
                        ),
                    )
                }
            }
        }
        Box(
            modifier = Modifier.weight(1f).fillMaxHeight(),
            contentAlignment = Alignment.TopCenter,
        ) {
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
            // Una columna de lectura cómoda en tablet: el diseño es de móvil y
            // estirado a 1200 dp las tarjetas y listas se vuelven ilegibles.
            modifier = Modifier.widthIn(max = 840.dp).fillMaxSize(),
            // Transiciones nativas (diseño v2): entre pestañas, fundido corto; al
            // abrir una pantalla, entra desde la derecha y la de debajo se
            // desplaza un poco a la izquierda, como en iPhone; al volver, al revés.
            enterTransition = {
                if (esPestana(targetState.destination.route)) fadeIn(tween(180))
                else slideInHorizontally(tween(320)) { it } + fadeIn(tween(200))
            },
            exitTransition = {
                if (esPestana(targetState.destination.route)) fadeOut(tween(140))
                else slideOutHorizontally(tween(320)) { -it / 4 } + fadeOut(tween(320), targetAlpha = 0.6f)
            },
            popEnterTransition = {
                if (esPestana(initialState.destination.route) && esPestana(targetState.destination.route)) fadeIn(tween(180))
                else slideInHorizontally(tween(320)) { -it / 4 } + fadeIn(tween(320), initialAlpha = 0.6f)
            },
            popExitTransition = {
                if (esPestana(initialState.destination.route) && esPestana(targetState.destination.route)) fadeOut(tween(140))
                else slideOutHorizontally(tween(320)) { it }
            }
        ) {
            composable(Screen.Dashboard.route) { 
                PanelScreen(
                    navController = navController, 
                    tokenStore = tokenStore, 
                    themeStore = themeStore, 
                    userProfile = profile, 
                    globalStats = stats, 
                    fromCache = panelFromCache,
                    racha = racha,
                    onRacha = { showRachaSheet = true },
                    onPerfil = { irA(BottomNavItem.Perfil) },
                    onBiblioteca = { irA(BottomNavItem.Library) },
                    sharedTransitionScope = this@SharedTransitionLayout,
                    animatedVisibilityScope = this,
                ) 
            }
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
            composable(Screen.Perfil.route) {
                com.paragon.app.ui.perfil.PerfilScreen(
                    profile = profile,
                    stats = stats,
                    racha = racha,
                    conLigas = themeStore.zenMode,
                    onNavigate = { ruta -> navController.navigate(ruta) },
                )
            }
            composable(Screen.Stats.route) { StatsScreen(tokenStore, handle = profile.handle, database = database, onBack = { navController.popBackStack() }) }
            composable(Screen.Feed.route) {
                com.paragon.app.ui.feed.ComunidadScreen(
                    tokenStore = tokenStore,
                    themeStore = themeStore,
                    onCompareClick = { handle -> navController.navigate(Screen.Compare.routeFor(handle)) },
                    onAbrirSesion = { id -> navController.navigate(Screen.SessionDetail.routeFor(id)) },
                    onAbrirPerfil = { handle -> navController.navigate(Screen.Usuario.routeFor(handle)) },
                )
            }
            composable(Screen.Social.route) {
                SocialScreen(
                    tokenStore, themeStore, myHandle = profile.handle, database = database,
                    onCompareClick = { handle -> navController.navigate(Screen.Compare.routeFor(handle)) },
                    onAbrirPerfil = { handle -> navController.navigate(Screen.Usuario.routeFor(handle)) },
                )
            }

            composable(Screen.Focus.route) {
                FocusScreen(tokenStore, onBack = { navController.popBackStack() })
            }
            composable(
                route = Screen.Compare.route,
                arguments = listOf(navArgument("handle") { nullable = true; defaultValue = null })
            ) { backStackEntry ->
                val initialHandle = backStackEntry.arguments?.read { getStringOrNull("handle") }
                CompareScreen(tokenStore, initialHandle = initialHandle, onBack = { navController.popBackStack() })
            }
            composable(Screen.Collections.route) {
                CollectionsScreen(navController, tokenStore, onBack = { navController.popBackStack() })
            }
            composable(Screen.StuckTrophies.route) {
                StuckTrophiesScreen(
                    tokenStore = tokenStore,
                    dao = remember { database.stuckTrophyDao() },
                    onBack = { navController.popBackStack() }
                )
            }
            
            // Pantallas de Ajustes
            composable(Screen.Settings.route) {
                SettingsScreen(
                    profile = profile,
                    repository = remember { SettingsRepository(tokenStore) },
                    themeStore = themeStore,
                    onBack = { navController.popBackStack() },
                    onNavigateToLinkedAccounts = { navController.navigate(Screen.LinkedAccounts.route) },
                    onNavigateToApariencia = { navController.navigate(Screen.Apariencia.route) },
                    onLogout = {
                        coroutineScope.launch {
                            // Común: el servidor desasocia el token de push (va en el
                            // cuerpo, por eso antes de borrar nada) y se borra la sesión.
                            PanelRepository(tokenStore).logout()
                            tokenStore.clear()
                            // Lo de cada plataforma: cachés, push, volver a empezar.
                            onLogout()
                        }
                    }
                )
            }
            composable(Screen.Apariencia.route) {
                com.paragon.app.ui.settings.AparienciaScreen(
                    tokenStore = tokenStore,
                    themeStore = themeStore,
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Screen.LinkedAccounts.route) {
                LinkedAccountsScreen(
                    repository = remember { SettingsRepository(tokenStore) },
                    onBack = { navController.popBackStack() }
                )
            }

            // Desglose del mes (como /ritmo en la web) — ver ui/trofeos.
            composable(Screen.Ritmo.route) {
                com.paragon.app.ui.trofeos.RitmoScreen(tokenStore = tokenStore, onBack = { navController.popBackStack() })
            }

            // Perfil completo de alguien (o el tuyo) — ver ui/perfil/PerfilUsuarioScreen.
            composable(
                route = Screen.Usuario.route,
                arguments = listOf(navArgument("handle") { type = NavType.StringType }),
            ) { backStackEntry ->
                val handle = backStackEntry.arguments?.read { getStringOrNull("handle") } ?: return@composable
                // "‹ De dónde vienes": la pantalla de debajo en la pila.
                val anterior = navController.previousBackStackEntry?.destination?.route
                val atras = when (anterior) {
                    Screen.Feed.route -> Screen.Feed.title
                    Screen.Social.route -> Screen.Social.title
                    else -> Screen.Perfil.title
                }
                com.paragon.app.ui.perfil.PerfilUsuarioScreen(
                    handle = handle,
                    tokenStore = tokenStore,
                    database = database,
                    themeStore = themeStore,
                    atras = atras,
                    onBack = { navController.popBackStack() },
                    onComparar = { h -> navController.navigate(Screen.Compare.routeFor(h)) },
                )
            }

            // Sesiones de trofeos online (lista y ficha) — ver ui/sesiones.
            composable(Screen.Sessions.route) {
                com.paragon.app.ui.sesiones.SesionesScreen(
                    tokenStore = tokenStore,
                    onBack = { navController.popBackStack() },
                    onAbrir = { id -> navController.navigate(Screen.SessionDetail.routeFor(id)) },
                )
            }
            composable(
                route = Screen.SessionDetail.route,
                arguments = listOf(navArgument("sesionId") { type = NavType.StringType }),
            ) { backStackEntry ->
                val sesionId = backStackEntry.arguments?.read { getStringOrNull("sesionId") } ?: return@composable
                com.paragon.app.ui.sesiones.SesionDetalleScreen(
                    tokenStore = tokenStore,
                    sesionId = sesionId,
                    onBack = { navController.popBackStack() },
                )
            }

            // Ficha de Juego
            composable(
                route = Screen.GameDetail.route,
                arguments = listOf(navArgument("gameId") { type = NavType.StringType }),
            ) { backStackEntry ->
                val gameId = backStackEntry.arguments?.read { getStringOrNull("gameId") } ?: return@composable
                GameDetailScreen(
                    gameId = gameId,
                    tokenStore = tokenStore,
                    handle = profile.handle,
                    onBack = { navController.popBackStack() },
                    onModoEnfoque = { navController.navigate(Screen.Focus.route) },
                    sharedTransitionScope = this@SharedTransitionLayout,
                    animatedVisibilityScope = this,
                )
            }
        }
        }
        }
        }
        }
    }

    if (showRachaSheet) {
        RachaSheet(tokenStore = tokenStore, onDismiss = { showRachaSheet = false })
    }
    }
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
            .clip(RoundedCornerShape(radio(14)))
            .clickable { onClick() }
            .background(if (viva) Gold.copy(alpha = 0.14f) else Color.Transparent)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Default.Whatshot,
            contentDescription = if (viva) Textos.t(T.main_racha, racha.actual) else Textos.t(T.main_sin_racha),
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

@Composable
private fun BarraInferior(
    items: List<BottomNavItem>,
    estaEn: (BottomNavItem) -> Boolean,
    foto: String?,
    inicial: String,
    onClick: (BottomNavItem) -> Unit,
) {
    Column(Modifier.fillMaxWidth().background(Background)) {
        HorizontalDivider(color = Border, thickness = 0.5.dp)
        Row(
            Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.navigationBars).height(52.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            items.forEach { item ->
                val activa = estaEn(item)
                Box(
                    Modifier.weight(1f).fillMaxHeight()
                        .clickable(
                            interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
                            indication = null,
                        ) { onClick(item) },
                    contentAlignment = Alignment.Center,
                ) {
                    if (item is BottomNavItem.Perfil) {
                        // Tu foto, como en Instagram; con anillo del acento si es la pestaña activa.
                        Box(
                            Modifier.size(30.dp).clip(CircleShape)
                                .border(if (activa) 2.dp else 1.dp, if (activa) Accent else Border, CircleShape)
                                .padding(if (activa) 3.dp else 1.dp).clip(CircleShape).background(com.paragon.app.ui.theme.AccentSoft),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(inicial.uppercase(), color = Accent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            com.paragon.app.ui.common.urlImagenSegura(foto)?.let { url ->
                                coil3.compose.AsyncImage(
                                    model = url,
                                    contentDescription = item.screen.title,
                                    contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize(),
                                )
                            }
                        }
                    } else {
                        Icon(
                            if (activa) item.icon else item.iconoInactivo,
                            contentDescription = item.screen.title,
                            tint = if (activa) Accent else Foreground.copy(alpha = 0.75f),
                            modifier = Modifier.size(27.dp),
                        )
                    }
                }
            }
        }
    }
}

/** Las raíces de la barra de abajo: entre ellas se cambia con fundido, no empujando. */
private fun esPestana(ruta: String?): Boolean = ruta in setOf(
    Screen.Dashboard.route, Screen.Library.route, Screen.Feed.route, Screen.Social.route, Screen.Perfil.route,
)
