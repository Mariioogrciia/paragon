package com.paragon.app.data.network

import com.paragon.app.data.auth.TokenStore
import com.paragon.shared.red.ClienteParagon
import com.paragon.shared.red.URL_BASE
import io.ktor.client.engine.okhttp.OkHttp
import okhttp3.Interceptor
import okhttp3.OkHttpClient

/** Dominio de la API y del login en el navegador (definido en :shared). */
const val BASE_URL = URL_BASE

/**
 * Acceso de la app Android a la API común (`ClienteParagon`, en :shared, con
 * Ktor). Mantiene las funciones de siempre (`panelApi(tokenStore)`...) para
 * que los repositorios no cambien mientras pasan a :shared.
 */
object ApiClient {
    @Volatile
    private var cliente: ClienteParagon? = null

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

    fun init(context: android.content.Context) {
        if (cache == null) cache = okhttp3.Cache(java.io.File(context.cacheDir, "http"), 10L * 1024 * 1024)
    }

    /** Al cerrar sesión: que nada de la cuenta anterior quede guardado en el móvil. */
    fun vaciarCache() {
        try { cache?.evictAll() } catch (e: Exception) { }
    }

    fun cliente(tokenStore: TokenStore): ClienteParagon =
        cliente ?: synchronized(this) {
            cliente ?: crear(tokenStore).also { cliente = it }
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

    fun panelApi(tokenStore: TokenStore) = cliente(tokenStore).panel
    fun gamesApi(tokenStore: TokenStore) = cliente(tokenStore).games
    fun libraryApi(tokenStore: TokenStore) = cliente(tokenStore).library
    fun feedApi(tokenStore: TokenStore) = cliente(tokenStore).feed
    fun socialApi(tokenStore: TokenStore) = cliente(tokenStore).social
    fun highlightsApi(tokenStore: TokenStore) = cliente(tokenStore).highlights
    fun logoutApi(tokenStore: TokenStore) = cliente(tokenStore).logout
    fun settingsApi(tokenStore: TokenStore) = cliente(tokenStore).settings
    fun statsApi(tokenStore: TokenStore) = cliente(tokenStore).stats
    fun milestoneApi(tokenStore: TokenStore) = cliente(tokenStore).milestone
    fun collectionsApi(tokenStore: TokenStore) = cliente(tokenStore).collections
    fun compareApi(tokenStore: TokenStore) = cliente(tokenStore).compare
    fun pushTokenApi(tokenStore: TokenStore) = cliente(tokenStore).pushToken
    fun rachaApi(tokenStore: TokenStore) = cliente(tokenStore).racha
    fun usersApi(tokenStore: TokenStore) = cliente(tokenStore).users
    fun leaguesApi(tokenStore: TokenStore) = cliente(tokenStore).leagues
    fun wishlistApi(tokenStore: TokenStore) = cliente(tokenStore).wishlist
    fun achievementsApi(tokenStore: TokenStore) = cliente(tokenStore).achievements
    fun clansApi(tokenStore: TokenStore) = cliente(tokenStore).clans
    fun dietApi(tokenStore: TokenStore) = cliente(tokenStore).diet
    fun wrapApi(tokenStore: TokenStore) = cliente(tokenStore).wrap
    fun trophyGuidesApi(tokenStore: TokenStore) = cliente(tokenStore).trophyGuides
    fun aparienciaApi(tokenStore: TokenStore) = cliente(tokenStore).apariencia
    fun steamApi(tokenStore: TokenStore) = cliente(tokenStore).steam
}
