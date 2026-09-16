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
        val request = if (token != null) {
            chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}

object ApiClient {
    @Volatile
    private var retrofit: Retrofit? = null

    fun panelApi(tokenStore: TokenStore): PanelApi = retrofit(tokenStore).create(PanelApi::class.java)
    fun gamesApi(tokenStore: TokenStore): GamesApi = retrofit(tokenStore).create(GamesApi::class.java)
    fun libraryApi(tokenStore: TokenStore): LibraryApi = retrofit(tokenStore).create(LibraryApi::class.java)
    fun feedApi(tokenStore: TokenStore): FeedApi = retrofit(tokenStore).create(FeedApi::class.java)
    fun socialApi(tokenStore: TokenStore): SocialApi = retrofit(tokenStore).create(SocialApi::class.java)
    fun highlightsApi(tokenStore: TokenStore): HighlightsApi = retrofit(tokenStore).create(HighlightsApi::class.java)
    fun logoutApi(tokenStore: TokenStore): LogoutApi = retrofit(tokenStore).create(LogoutApi::class.java)
    fun settingsApi(tokenStore: TokenStore): SettingsApi = retrofit(tokenStore).create(SettingsApi::class.java)

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
