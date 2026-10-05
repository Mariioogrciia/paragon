package com.paragon.app.data.network

import com.paragon.app.data.auth.TokenStore
import com.paragon.shared.red.ClienteParagon
import io.ktor.client.engine.okhttp.OkHttp
import okhttp3.Interceptor
import okhttp3.OkHttpClient

/** Lo propio de Android para la API: motor OkHttp, caché HTTP y modo demo. */
object ApiAndroid {
    /**
     * Caché HTTP de 10 MB (auditoría, 4 oct 2026): las rutas grandes de
     * /api/mobile (biblioteca, panel, estadísticas...) mandan ETag, así que
     * OkHttp revalida con If-None-Match y, si nada ha cambiado, el servidor
     * contesta 304 sin cuerpo y se usa la copia guardada. Ver src/lib/etag.ts.
     */
    private var cache: okhttp3.Cache? = null

    /** Solo lo pone el modo demo de la compilación de depuración (src/debug/.../ModoDemo.kt). */
    @Volatile
    var interceptorDemo: Interceptor? = null
        set(value) {
            field = value
            // El cliente se crea la primera vez que se usa: con el interceptor ya puesto.
            ApiClient.configurar(::crear)
        }

    fun init(context: android.content.Context) {
        if (cache == null) cache = okhttp3.Cache(java.io.File(context.cacheDir, "http"), 10L * 1024 * 1024)
        ApiClient.configurar(::crear)
    }

    /** Al cerrar sesión: que nada de la cuenta anterior quede guardado en el móvil. */
    fun vaciarCache() {
        try { cache?.evictAll() } catch (e: Exception) { }
    }

    private fun crear(tokenStore: TokenStore): ClienteParagon {
        val okHttp = OkHttpClient.Builder()
            .apply { cache?.let { cache(it) } }
            .apply { interceptorDemo?.let { addInterceptor(it) } }
            .build()
        return ClienteParagon(
            motor = OkHttp.create { preconfigured = okHttp },
            token = { tokenStore.token },
            idioma = { java.util.Locale.getDefault().toLanguageTag() },
        )
    }
}
