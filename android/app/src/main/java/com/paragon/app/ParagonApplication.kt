package com.paragon.app

import android.app.Application
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.request.crossfade
import com.paragon.app.util.Textos

/**
 * Ningún `AsyncImage` de la app pedía `crossfade` — cada carátula, avatar o
 * icono de trofeo aparecía con un "pop" brusco en vez de una transición
 * suave, porque nunca hubo un `ImageLoader` propio con un valor por
 * defecto: Coil usaba el suyo genérico. Un solo punto de configuración
 * para toda la app, en vez de repetir `.crossfade(true)` en cada
 * `ImageRequest` (o, peor, olvidarlo en alguno).
 */
class ParagonApplication : Application(), SingletonImageLoader.Factory {
    override fun onCreate() {
        super.onCreate()
        Textos.init(this)
        com.paragon.app.data.network.ApiClient.init(this)
    }

    override fun newImageLoader(context: PlatformContext): ImageLoader {
        return ImageLoader.Builder(context)
            .crossfade(true)
            .build()
    }
}
