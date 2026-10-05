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

/**
 * "Siguiente trofeo" — mismo recomendador que la portada web
 * (lib/recommendations.ts): prioriza juego base sobre DLC, progreso alto y
 * mayor probabilidad real de conseguirlo. `rarityPercent`/`grade`/`iconUrl`
 * pueden venir `null` (ver CONTRACT.md).
 */
data class NextTrophyDto(
    val gameId: String,
    val gameTitle: String,
    val trophyId: String,
    val trophyName: String,
    val detail: String,
    val rarityPercent: Double?,
    val gameProgress: Int,
    val iconUrl: String?,
    val grade: String?,
)

data class HighlightsResponse(
    val nearPlatinum: List<GameCardDto>,
    val recent: List<GameCardDto>,
    // Default por si una versión vieja del backend cacheada no lo manda —
    // sin esto, Gson/Moshi deja la lista en null y revienta el .map() de
    // PanelRepository en vez de mostrar la sección vacía sin más.
    val nextTrophies: List<NextTrophyDto> = emptyList(),
)

interface HighlightsApi {
    /** Ver src/app/api/mobile/panel/highlights/route.ts en el proyecto Next.js. */
    @GET("api/mobile/panel/highlights")
    suspend fun getHighlights(): HighlightsResponse
}
