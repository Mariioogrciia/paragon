package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.AddWishlistRequest
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.GameSearchResultDto

/** Un resultado de búsqueda en el catálogo (IGDB) — "Añadir a Paragon" desde el Sharesheet. */
data class GameSearchResult(
    val igdbId: Int,
    val title: String,
    val coverUrl: String?,
    val developer: String?,
    val publisher: String?,
    val genres: List<String>?,
    val pegi: String?,
)

private fun GameSearchResultDto.toDomain() = GameSearchResult(igdbId, title, coverUrl, developer, publisher, genres, pegi)

class WishlistRepository(private val tokenStore: TokenStore? = null) {
    suspend fun search(query: String): List<GameSearchResult> {
        val store = tokenStore ?: return emptyList()
        return try {
            ApiClient.wishlistApi(store).search(query).results.map { it.toDomain() }
        } catch (e: Exception) {
            emptyList()
        }
    }

    /** "Deseados" fijo como dispositivo — igual que el valor por defecto de `addToWishlistAction` en la web, no hay catálogo de dispositivos que elegir aquí. */
    suspend fun addToWishlist(game: GameSearchResult): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.wishlistApi(store).addToWishlist(
                AddWishlistRequest(
                    igdbId = game.igdbId,
                    title = game.title,
                    coverUrl = game.coverUrl,
                    pegi = game.pegi,
                    genres = game.genres,
                    developer = game.developer,
                    publisher = game.publisher,
                    deviceLabel = "Deseados",
                ),
            )
            true
        } catch (e: Exception) {
            false
        }
    }
}
