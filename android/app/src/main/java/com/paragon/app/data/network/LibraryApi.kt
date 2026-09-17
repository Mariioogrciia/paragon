package com.paragon.app.data.network

import retrofit2.http.GET

// Sin @JsonClass(generateAdapter = true) — mismo motivo que PanelApi.kt/
// GamesApi.kt: KotlinJsonAdapterFactory (reflexión) lee estas data class
// directamente, sin kapt.
/** `null` en Steam/Xbox — no tienen desglose por metal (ver API-CONTRACT.md). */
data class TrophyBreakdownDto(val bronze: Int, val silver: Int, val gold: Int, val platinum: Int)

data class LibraryGameDto(
    val id: String,
    val platform: String,
    val title: String,
    val iconUrl: String?,
    val progressPercent: Int,
    val definedTotal: Int,
    val earnedTotal: Int,
    val earned: TrophyBreakdownDto?,
    val isWishlist: Boolean,
    val isPinned: Boolean?,
    val lastPlayedAt: String?,
    val playtimeMinutes: Int?,
)

data class LibraryResponse(val games: List<LibraryGameDto>)

interface LibraryApi {
    /** Ver src/app/api/mobile/library/route.ts en el proyecto Next.js. */
    @GET("api/mobile/library")
    suspend fun getLibrary(): LibraryResponse
}
