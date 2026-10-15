package com.paragon.app.ui.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import io.ktor.http.decodeURLPart

/**
 * Tocar una notificación lleva a su pantalla (15 oct 2026). Los avisos del
 * servidor llevan la ruta de la WEB (`/juego/…`, `/sesiones/…`, `/u/…`); la
 * plataforma la deja aquí al tocar el aviso (Android: ComposeMainActivity;
 * iOS: AppDelegate.swift → AppIOS.abrirAviso) y MainScreen la abre en cuanto
 * está lista, también si la app arrancaba desde cero.
 */
object EnlaceAviso {
    var pendiente by mutableStateOf<String?>(null)
}

/**
 * La ruta de la app que corresponde a una de la web, o null si no hay
 * pantalla equivalente (entonces se queda en Inicio). `miHandle`: un aviso
 * de un juego tuyo (`/u/<tú>/<juego>`, el del platino) abre TU ficha, no la
 * de "otra persona".
 */
fun rutaAppDeAviso(rutaWeb: String, miHandle: String?): String? {
    val sinDominio = rutaWeb.trim().let { if (it.contains("://")) "/" + it.substringAfter("://").substringAfter('/', "") else it }
    val partes = sinDominio.substringBefore('?').substringBefore('#')
        .split('/').filter { it.isNotEmpty() }
        .map { try { it.decodeURLPart() } catch (e: Exception) { it } }
    return when (partes.firstOrNull()) {
        "juego" -> partes.getOrNull(1)?.let { Screen.GameDetail.routeFor(it) }
        "u" -> {
            val handle = partes.getOrNull(1)?.removePrefix("@") ?: return null
            val juego = partes.getOrNull(2)
            when {
                juego == null -> Screen.Usuario.routeFor(handle)
                handle.equals(miHandle, ignoreCase = true) -> Screen.GameDetail.routeFor(juego)
                else -> Screen.GameDetail.routeFor(juego, de = handle)
            }
        }
        "sesiones" -> partes.getOrNull(1)?.let { Screen.SessionDetail.routeFor(it) } ?: Screen.Sessions.route
        // Amigos, ligas y clanes viven en la pestaña Ligas de la app.
        "amigos", "ligas", "clanes" -> Screen.Social.route
        "ritmo" -> Screen.Ritmo.route
        else -> null
    }
}
