package com.paragon.app.ui.common

import coil3.map.Mapper
import coil3.request.Options
import com.paragon.shared.BASE_URL

/**
 * Corrige TODAS las URLs de imagen antes de que Coil las pida, en Android e
 * iOS (se registra en los dos ImageLoader). Antes solo algunas pantallas
 * pasaban por `urlImagenSegura` y en otras no cargaban carátulas ni avatares:
 * - `http://` → `https://` (iOS bloquea http; las fotos de PSN, por ejemplo).
 * - `//host/...` (sin esquema) → `https://host/...`.
 * - `/ruta` (relativa a la web, como las portadas subidas) → la web + la ruta.
 */
object UrlImagenesMapper : Mapper<String, String> {
    override fun map(data: String, options: Options): String? {
        val url = data.trim()
        return when {
            url.startsWith("http://") -> "https://" + url.removePrefix("http://")
            url.startsWith("//") -> "https:$url"
            url.startsWith("/") -> BASE_URL + url
            else -> null
        }
    }
}
