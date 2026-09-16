package com.paragon.app.data.network

import retrofit2.http.GET

data class GameCardDto(
    val id: String,
    val title: String,
    val coverUrl: String,
    val earnedTrophies: Int,
    val totalTrophies: Int,
    val percent: Int,
)

data class HighlightsResponse(
    val nearPlatinum: List<GameCardDto>,
    val recent: List<GameCardDto>,
)

interface HighlightsApi {
    /** Ver src/app/api/mobile/panel/highlights/route.ts en el proyecto Next.js. */
    @GET("api/mobile/panel/highlights")
    suspend fun getHighlights(): HighlightsResponse
}
