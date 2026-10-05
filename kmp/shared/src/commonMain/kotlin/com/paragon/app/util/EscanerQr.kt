package com.paragon.app.util

import com.paragon.shared.BASE_URL
import com.paragon.shared.ContextoPlataforma

/**
 * Códigos QR de Paragon (5 oct 2026). El QR lleva un enlace normal de la web
 * — `…/u/<handle>` (tu perfil) o `…/sesiones/<id>` (una sesión) — para que
 * también funcione con la cámara del móvil sin la app: abre la página. Dentro
 * de la app, el lector lo convierte en una acción (agregar amigo, abrir la
 * sesión).
 */
sealed class DestinoQr {
    data class Perfil(val handle: String) : DestinoQr()
    data class Sesion(val id: String) : DestinoQr()
}

fun enlacePerfil(handle: String): String = "$BASE_URL/u/$handle"

fun enlaceSesion(id: String): String = "$BASE_URL/sesiones/$id"

/** Qué quiere decir un QR leído; null si no es de Paragon. */
fun interpretarQr(texto: String): DestinoQr? {
    val limpio = texto.trim().substringBefore('?').substringBefore('#').trimEnd('/')
    val ruta = when {
        limpio.startsWith("paragon://") -> limpio.removePrefix("paragon://")
        limpio.contains("/u/") || limpio.contains("/sesiones/") -> limpio.substringAfter("://").substringAfter('/')
        else -> return null
    }
    val partes = ruta.split('/').filter { it.isNotEmpty() }
    return when {
        partes.size >= 2 && partes[0] == "u" -> DestinoQr.Perfil(partes[1].removePrefix("@"))
        partes.size >= 2 && partes[0] == "sesiones" -> DestinoQr.Sesion(partes[1])
        else -> null
    }
}

/**
 * Abre la cámara para leer un QR y llama a `alLeer` con el texto. En Android
 * es el lector de Google Play (no pide permiso de cámara a la app); en iOS,
 * una vista de cámara propia que se cierra deslizando hacia abajo.
 */
expect fun escanearQr(contexto: ContextoPlataforma, alLeer: (String) -> Unit)
