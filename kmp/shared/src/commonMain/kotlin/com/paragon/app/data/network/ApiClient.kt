package com.paragon.app.data.network

import com.paragon.app.data.auth.TokenStore
import com.paragon.shared.red.ClienteParagon
import com.paragon.shared.red.URL_BASE
import kotlin.concurrent.Volatile

/** Dominio de la API y del login en el navegador. */
const val BASE_URL = URL_BASE

/**
 * Acceso a la API común (`ClienteParagon`) desde los repositorios. Cada
 * plataforma dice al arrancar cómo se crea el cliente (`configurar`): en
 * Android, con OkHttp, caché HTTP y modo demo (ApiAndroid); en iOS, con Darwin.
 */
object ApiClient {
    @Volatile
    private var cliente: ClienteParagon? = null
    private var fabrica: ((TokenStore) -> ClienteParagon)? = null

    fun configurar(crear: (TokenStore) -> ClienteParagon) {
        fabrica = crear
        cliente = null
    }

    fun cliente(tokenStore: TokenStore): ClienteParagon =
        cliente ?: requireNotNull(fabrica) { "ApiClient.configurar no se ha llamado al arrancar" }
            .invoke(tokenStore).also { cliente = it }

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
    fun sesionesApi(tokenStore: TokenStore) = cliente(tokenStore).sesiones
    fun amigosApi(tokenStore: TokenStore) = cliente(tokenStore).amigos
    fun dietApi(tokenStore: TokenStore) = cliente(tokenStore).diet
    fun wrapApi(tokenStore: TokenStore) = cliente(tokenStore).wrap
    fun trophyGuidesApi(tokenStore: TokenStore) = cliente(tokenStore).trophyGuides
    fun aparienciaApi(tokenStore: TokenStore) = cliente(tokenStore).apariencia
    fun steamApi(tokenStore: TokenStore) = cliente(tokenStore).steam
}
