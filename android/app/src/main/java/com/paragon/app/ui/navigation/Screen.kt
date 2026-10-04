package com.paragon.app.ui.navigation

import androidx.annotation.StringRes
import com.paragon.app.R
import com.paragon.app.util.Textos

/** `titleRes`: el título traducido (es/en/de/fr, ver android/i18n/textos.json). */
sealed class Screen(val route: String, @StringRes val titleRes: Int) {
    val title: String get() = Textos.t(titleRes)

    object Dashboard : Screen("dashboard", R.string.nav_panel)
    object Library : Screen("library", R.string.nav_biblioteca)
    object Feed : Screen("feed", R.string.nav_comunidad)
    object Social : Screen("social", R.string.nav_ligas)
    // No es un item de la barra inferior — se llega desde una tarjeta de
    // juego (ver GameDetailScreen.kt), de ahí el argumento en la ruta.
    object GameDetail : Screen("game/{gameId}", R.string.nav_ficha) {
        fun routeFor(gameId: String) = "game/$gameId"
    }
    object Settings : Screen("settings", R.string.nav_ajustes)
    object LinkedAccounts : Screen("linked_accounts", R.string.cuentas_titulo)
    object Stats : Screen("stats", R.string.nav_estadisticas)
    object Focus : Screen("focus", R.string.nav_enfoque)
    object Compare : Screen("compare?handle={handle}", R.string.nav_comparar) {
        fun routeFor(handle: String) = "compare?handle=$handle"
    }
    object Collections : Screen("collections", R.string.nav_carpetas)
    object StuckTrophies : Screen("stuck_trophies", R.string.nav_atascados)
}
