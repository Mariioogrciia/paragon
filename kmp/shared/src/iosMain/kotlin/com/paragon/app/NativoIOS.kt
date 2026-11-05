package com.paragon.app

/**
 * Lo que solo se puede hacer desde Swift y Kotlin necesita pedir: la app de
 * Swift registra sus implementaciones en `AppIOS` al arrancar (iOSApp.swift),
 * igual que `HapticosIOS`. Sin registrar, no pasa nada.
 */

/** Notificaciones push (APNs): pedir permiso y registrarse (ver AppDelegate.swift). */
interface AvisosIOS {
    fun pedirPermiso()
}

/**
 * Recordatorio local de racha (RecordatorioRacha.kt): lo programa Swift con
 * UNUserNotificationCenter. `titulo` y `texto` ya vienen en el idioma de la app.
 */
/** Spotlight (IndiceBusqueda.kt): lo indexa Swift con CoreSpotlight. Ids y títulos en el mismo orden. */
interface BusquedaIOS {
    fun indexar(ids: List<String>, titulos: List<String>, detalles: List<String>)
}

interface RachaIOS {
    fun programarRecordatorio(dias: Int, hoyHecho: Boolean, titulo: String, texto: String)
}

/** WidgetKit solo existe en Swift: `WidgetCenter.shared.reloadAllTimelines()`. */
interface WidgetIOS {
    fun recargar()
}

/** El App Group que comparten la app y el widget (Paragon.entitlements y ParagonWidget.entitlements). */
const val GRUPO_APP = "group.com.paragon.app.kmp"
