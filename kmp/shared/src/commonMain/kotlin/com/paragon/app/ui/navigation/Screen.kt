package com.paragon.app.ui.navigation

import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.Texto
import com.paragon.shared.i18n.T

/** `titleRes`: el título traducido (es/en/de/fr, ver android/i18n/textos.json). */
sealed class Screen(val route: String, val titleTexto: Texto) {
    val title: String get() = Textos.t(titleTexto)

    object Dashboard : Screen("dashboard", T.nav_panel)
    object Library : Screen("library", T.nav_biblioteca)
    object Feed : Screen("feed", T.nav_comunidad)
    object Social : Screen("social", T.nav_ligas)
    // No es un item de la barra inferior — se llega desde una tarjeta de
    // juego (ver GameDetailScreen.kt), de ahí el argumento en la ruta.
    object GameDetail : Screen("game/{gameId}", T.nav_ficha) {
        fun routeFor(gameId: String) = "game/$gameId"
    }
    object Settings : Screen("settings", T.nav_ajustes)
    object LinkedAccounts : Screen("linked_accounts", T.cuentas_titulo)
    object Apariencia : Screen("apariencia", T.apariencia_titulo)
    object Stats : Screen("stats", T.nav_estadisticas)
    object Focus : Screen("focus", T.nav_enfoque)
    object Compare : Screen("compare?handle={handle}", T.nav_comparar) {
        fun routeFor(handle: String) = "compare?handle=$handle"
    }
    object Collections : Screen("collections", T.nav_carpetas)
    object Perfil : Screen("perfil", T.nav_perfil)
    object StuckTrophies : Screen("stuck_trophies", T.nav_atascados)
    object Sessions : Screen("sessions", T.nav_sesiones)
    object Ritmo : Screen("ritmo", T.ritmo_titulo)
    // Perfil completo de cualquiera (9 oct 2026), también el tuyo — ver ui/perfil.
    object Usuario : Screen("user/{handle}", T.nav_perfil) {
        fun routeFor(handle: String) = "user/$handle"
    }
    object SessionDetail : Screen("session/{sesionId}", T.nav_sesiones) {
        fun routeFor(sesionId: String) = "session/$sesionId"
    }
}
