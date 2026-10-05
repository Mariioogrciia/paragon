package com.paragon.app.data.network

import com.paragon.app.data.auth.TokenStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

/**
 * Mismo dominio que capacitor.config.ts (server.url) — cuando eso cambie a un
 * dominio propio, cambia aquí también.
 */
const val BASE_URL = "https://platinos-nine.vercel.app/"

/** Añade `Authorization: Bearer <token>` a cada llamada si hay sesión guardada. */
private class AuthInterceptor(private val tokenStore: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
        val token = tokenStore.token
        val builder = chain.request().newBuilder()
            // Idioma del teléfono: el servidor devuelve los nombres de los
            // trofeos en ese idioma si la plataforma los tiene (ver
            // idiomaDeCabecera en lib/idiomasTrofeo.ts).
            .header("Accept-Language", java.util.Locale.getDefault().toLanguageTag())
        if (token != null) builder.addHeader("Authorization", "Bearer $token")
        return chain.proceed(builder.build())
    }
}

object ApiClient {
    @Volatile
    private var retrofit: Retrofit? = null

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

    fun panelApi(tokenStore: TokenStore): PanelApi = retrofit(tokenStore).create(PanelApi::class.java)
    fun gamesApi(tokenStore: TokenStore): GamesApi = retrofit(tokenStore).create(GamesApi::class.java)
    fun libraryApi(tokenStore: TokenStore): LibraryApi = retrofit(tokenStore).create(LibraryApi::class.java)
    fun feedApi(tokenStore: TokenStore): FeedApi = retrofit(tokenStore).create(FeedApi::class.java)
    fun socialApi(tokenStore: TokenStore): SocialApi = retrofit(tokenStore).create(SocialApi::class.java)
    fun highlightsApi(tokenStore: TokenStore): HighlightsApi = retrofit(tokenStore).create(HighlightsApi::class.java)
    fun logoutApi(tokenStore: TokenStore): LogoutApi = retrofit(tokenStore).create(LogoutApi::class.java)
    fun settingsApi(tokenStore: TokenStore): SettingsApi = retrofit(tokenStore).create(SettingsApi::class.java)
    fun statsApi(tokenStore: TokenStore): StatsApi = retrofit(tokenStore).create(StatsApi::class.java)
    fun milestoneApi(tokenStore: TokenStore): MilestoneApi = retrofit(tokenStore).create(MilestoneApi::class.java)
    fun collectionsApi(tokenStore: TokenStore): CollectionsApi = retrofit(tokenStore).create(CollectionsApi::class.java)
    fun compareApi(tokenStore: TokenStore): CompareApi = retrofit(tokenStore).create(CompareApi::class.java)
    fun pushTokenApi(tokenStore: TokenStore): PushTokenApi = retrofit(tokenStore).create(PushTokenApi::class.java)
    fun rachaApi(tokenStore: TokenStore): RachaApi = retrofit(tokenStore).create(RachaApi::class.java)
    fun usersApi(tokenStore: TokenStore): UsersApi = retrofit(tokenStore).create(UsersApi::class.java)
    fun leaguesApi(tokenStore: TokenStore): LeaguesApi = retrofit(tokenStore).create(LeaguesApi::class.java)
    fun wishlistApi(tokenStore: TokenStore): WishlistApi = retrofit(tokenStore).create(WishlistApi::class.java)
    fun achievementsApi(tokenStore: TokenStore): AchievementsApi = retrofit(tokenStore).create(AchievementsApi::class.java)
    fun clansApi(tokenStore: TokenStore): ClansApi = retrofit(tokenStore).create(ClansApi::class.java)
    fun dietApi(tokenStore: TokenStore): DietApi = retrofit(tokenStore).create(DietApi::class.java)
    fun wrapApi(tokenStore: TokenStore): WrapApi = retrofit(tokenStore).create(WrapApi::class.java)
    fun trophyGuidesApi(tokenStore: TokenStore): TrophyGuidesApi = retrofit(tokenStore).create(TrophyGuidesApi::class.java)
    fun aparienciaApi(tokenStore: TokenStore): AparienciaApi = retrofit(tokenStore).create(AparienciaApi::class.java)

    /**
     * Un único Retrofit cacheado para todos los servicios — `.create()` sobre
     * uno ya construido es barato (solo genera el proxy dinámico), así que no
     * hace falta cachear cada interfaz por separado.
     */
    private fun retrofit(tokenStore: TokenStore): Retrofit =
        retrofit ?: synchronized(this) {
            retrofit ?: build(tokenStore).also { retrofit = it }
        }

    private fun build(tokenStore: TokenStore): Retrofit {
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenStore))
            .apply { cache?.let { cache(it) } }
            .apply { interceptorDemo?.let { addInterceptor(it) } }
            .build()

        val moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
    }
}
