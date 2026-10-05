package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class GameSearchResultDto(
    val igdbId: Int,
    val title: String,
    val coverUrl: String?,
    val developer: String?,
    val publisher: String?,
    val genres: List<String>?,
    val pegi: String?,
)
@Serializable
data class GameSearchResponse(val results: List<GameSearchResultDto>)

@Serializable
data class AddWishlistRequest(
    val igdbId: Int,
    val title: String,
    val coverUrl: String?,
    val pegi: String?,
    val genres: List<String>?,
    val developer: String?,
    val publisher: String?,
    val deviceLabel: String,
)
@Serializable
data class AddWishlistResponse(val gameId: String)

/** "Añadir a Paragon" desde el Sharesheet — ver .../games/search y .../wishlist en API-CONTRACT.md. */
class WishlistApi internal constructor(private val c: ClienteParagon) {
    suspend fun search(query: String): GameSearchResponse =
        c.http.get("api/mobile/games/search") { parameter("q", query) }.body()

    suspend fun addToWishlist(request: AddWishlistRequest): AddWishlistResponse =
        c.http.post("api/mobile/wishlist") { json(request) }.body()
}
