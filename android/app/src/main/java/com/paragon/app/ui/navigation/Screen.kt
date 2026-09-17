package com.paragon.app.ui.navigation

sealed class Screen(val route: String, val title: String) {
    object Dashboard : Screen("dashboard", "Panel")
    object Library : Screen("library", "Biblioteca")
    object Feed : Screen("feed", "Comunidad")
    object Social : Screen("social", "Ligas")
    // No es un item de la barra inferior — se llega desde una tarjeta de
    // juego (ver GameDetailScreen.kt), de ahí el argumento en la ruta.
    object GameDetail : Screen("game/{gameId}", "Ficha de juego") {
        fun routeFor(gameId: String) = "game/$gameId"
    }
    object Settings : Screen("settings", "Ajustes")
    object LinkedAccounts : Screen("linked_accounts", "Cuentas Vinculadas")
    object Stats : Screen("stats", "Estadísticas")
    object Focus : Screen("focus", "Modo Enfoque")
    object Compare : Screen("compare?handle={handle}", "Comparar") {
        fun routeFor(handle: String) = "compare?handle=$handle"
    }
    object Collections : Screen("collections", "Carpetas")
    object StuckTrophies : Screen("stuck_trophies", "Trofeos Atascados")
}
