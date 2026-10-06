package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
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
@Serializable
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

/** "Últimos trofeos" — `ultimosTrofeos()` de lib/history.ts, igual que el perfil web. */
@Serializable
data class LatestTrophyDto(
    val gameId: String,
    val gameTitle: String,
    val gameIconUrl: String? = null,
    val trophyId: String,
    val trophyName: String,
    val iconUrl: String? = null,
    val grade: String? = null,
    val earnedAt: String,
    val rarityPercent: Double? = null,
)

@Serializable
data class HighlightsResponse(
    val nearPlatinum: List<GameCardDto>,
    val recent: List<GameCardDto>,
    // Default por si una versión vieja del backend cacheada no lo manda —
    // sin esto, Gson/Moshi deja la lista en null y revienta el .map() de
    // PanelRepository en vez de mostrar la sección vacía sin más.
    val nextTrophies: List<NextTrophyDto> = emptyList(),
    val latestTrophies: List<LatestTrophyDto> = emptyList(),
)

class HighlightsApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/panel/highlights/route.ts en el proyecto Next.js. */
    suspend fun getHighlights(): HighlightsResponse =
        c.http.get("api/mobile/panel/highlights").body()
}
