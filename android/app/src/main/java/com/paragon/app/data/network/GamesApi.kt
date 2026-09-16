package com.paragon.app.data.network

import retrofit2.http.GET
import retrofit2.http.Path

// Sin @JsonClass(generateAdapter = true) — mismo motivo que PanelApi.kt: sin
// kapt montado, KotlinJsonAdapterFactory (reflexión) lee estas data class
// directamente.
data class TrophyDto(
    val id: String,
    val name: String,
    val detail: String,
    val grade: String?,
    val earned: Boolean,
    val earnedAt: String?,
    val rarityPercent: Double?,
)

data class GameDetailDto(
    val id: String,
    val platform: String,
    val title: String,
    val iconUrl: String?,
    val progressPercent: Int,
    val definedTotal: Int,
    val earnedTotal: Int,
    val trophies: List<TrophyDto>,
)

data class GameDetailResponse(val game: GameDetailDto)

interface GamesApi {
    /** Ver src/app/api/mobile/games/[gameId]/route.ts en el proyecto Next.js. */
    @GET("api/mobile/games/{gameId}")
    suspend fun getGameDetail(@Path("gameId") gameId: String): GameDetailResponse
}
