package com.paragon.app.data.network

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

data class TrophyGuideRowDto(
    val id: String,
    val body: String,
    val language: String,
    val createdAt: String,
    val updatedAt: String,
    val authorId: String,
    val authorHandle: String?,
    val authorName: String?,
    val authorImage: String?,
)
data class TrophyGuidesResponse(val guides: List<TrophyGuideRowDto>, val currentUserId: String?)
data class SaveTrophyGuideRequest(val body: String)

/** Guías escritas de un trofeo — ver games/[gameId]/trophies/[trophyId]/guides/route.ts en el proyecto Next.js. */
interface TrophyGuidesApi {
    @GET("api/mobile/games/{gameId}/trophies/{trophyId}/guides")
    suspend fun getGuides(@Path("gameId") gameId: String, @Path("trophyId") trophyId: String): TrophyGuidesResponse

    @POST("api/mobile/games/{gameId}/trophies/{trophyId}/guides")
    suspend fun saveGuide(@Path("gameId") gameId: String, @Path("trophyId") trophyId: String, @Body request: SaveTrophyGuideRequest)

    @DELETE("api/mobile/games/{gameId}/trophies/{trophyId}/guides")
    suspend fun deleteGuide(@Path("gameId") gameId: String, @Path("trophyId") trophyId: String)
}
