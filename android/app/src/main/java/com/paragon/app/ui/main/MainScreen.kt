package com.paragon.app.ui.main

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
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
import com.paragon.app.data.SettingsRepository
import com.paragon.app.data.UserProfile
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.collections.CollectionsScreen
import com.paragon.app.ui.compare.CompareScreen
import com.paragon.app.ui.feed.FeedScreen
import com.paragon.app.ui.focus.FocusScreen
import com.paragon.app.ui.game.GameDetailScreen
import com.paragon.app.ui.library.LibraryScreen
import com.paragon.app.ui.navigation.Screen
import com.paragon.app.ui.panel.PanelScreen
import com.paragon.app.ui.social.SocialScreen
import com.paragon.app.ui.settings.SettingsScreen
import com.paragon.app.ui.settings.LinkedAccountsScreen
import com.paragon.app.ui.stats.StatsScreen
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted

// Definimos la estructura de items de navegación
sealed class BottomNavItem(val screen: Screen, val icon: ImageVector) {
    object Dashboard : BottomNavItem(Screen.Dashboard, Icons.Default.Home)
    object Library : BottomNavItem(Screen.Library, Icons.AutoMirrored.Filled.List)
    object Stats : BottomNavItem(Screen.Stats, Icons.Default.BarChart)
    object Feed : BottomNavItem(Screen.Feed, Icons.Default.Groups)
    object Social : BottomNavItem(Screen.Social, Icons.Default.EmojiEvents)
}

@Composable
fun MainScreen(tokenStore: TokenStore, themeStore: com.paragon.app.data.theme.ThemeStore, profile: UserProfile, stats: GlobalStats) {
    val navController = rememberNavController()
    var isSearchActive by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var isMenuExpanded by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    val items = listOf(
        BottomNavItem.Dashboard,
        BottomNavItem.Library,
        BottomNavItem.Stats,
        BottomNavItem.Feed,
        BottomNavItem.Social
    )

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Background)
                    .padding(horizontal = 24.dp, vertical = 16.dp)
                    .windowInsetsPadding(WindowInsets.statusBars),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isSearchActive) {
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
                    Text(
                        text = "PARAGON",
                        color = Foreground,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp
                    )
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = { isSearchActive = true }) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Buscar",
                            tint = Foreground
                        )
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
                            modifier = Modifier.background(com.paragon.app.ui.theme.Surface)
                        ) {
                            DropdownMenuItem(
                                text = { Text("Modo Enfoque", color = Foreground) },
                                onClick = {
                                    isMenuExpanded = false
                                    navController.navigate(Screen.Focus.route)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Comparar", color = Foreground) },
                                onClick = {
                                    isMenuExpanded = false
                                    navController.navigate(Screen.Compare.route)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Carpetas", color = Foreground) },
                                onClick = {
                                    isMenuExpanded = false
                                    navController.navigate(Screen.Collections.route)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Ajustes", color = Foreground) },
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
            // Sin este padding, la barra de gestos/navegación del sistema
            // (enableEdgeToEdge en ComposeMainActivity dibuja toda la app
            // por debajo de ella) se solapa con las etiquetas de la barra
            // inferior — el BOM de Compose de este proyecto (2024.02.00,
            // fijado por compatibilidad con Kotlin 1.9.22) es de antes de
            // que NavigationBar aplicara este inset por su cuenta.
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
                            navController.navigate(item.screen.route) {
                                // Evitar crear historial múltiple
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
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
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Dashboard.route) { PanelScreen(navController, tokenStore, profile, stats) }
            composable(Screen.Library.route) { LibraryScreen(navController, tokenStore, searchQuery) }
            composable(Screen.Stats.route) { StatsScreen(tokenStore) }
            composable(Screen.Feed.route) { FeedScreen(tokenStore) }
            composable(Screen.Social.route) { SocialScreen(tokenStore) }

            composable(Screen.Focus.route) {
                FocusScreen(tokenStore, onBack = { navController.popBackStack() })
            }
            composable(Screen.Compare.route) {
                CompareScreen(tokenStore, onBack = { navController.popBackStack() })
            }
            composable(Screen.Collections.route) {
                CollectionsScreen(navController, tokenStore, onBack = { navController.popBackStack() })
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
                GameDetailScreen(gameId = gameId, tokenStore = tokenStore, onBack = { navController.popBackStack() })
            }
        }
    }
}
