package com.paragon.app.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

data class GameSearchResultDto(
    val igdbId: Int,
    val title: String,
    val coverUrl: String?,
    val developer: String?,
    val publisher: String?,
    val genres: List<String>?,
    val pegi: String?,
)
data class GameSearchResponse(val results: List<GameSearchResultDto>)

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
data class AddWishlistResponse(val gameId: String)

/** "Añadir a Paragon" desde el Sharesheet — ver .../games/search y .../wishlist en API-CONTRACT.md. */
interface WishlistApi {
    @GET("api/mobile/games/search")
    suspend fun search(@Query("q") query: String): GameSearchResponse

    @POST("api/mobile/wishlist")
    suspend fun addToWishlist(@Body request: AddWishlistRequest): AddWishlistResponse
}
