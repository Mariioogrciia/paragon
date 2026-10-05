package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

// Sin @JsonClass(generateAdapter = true) — mismo motivo que PanelApi.kt/
// GamesApi.kt: KotlinJsonAdapterFactory (reflexión) lee estas data class
// directamente, sin kapt.
/** `null` en Steam/Xbox — no tienen desglose por metal (ver API-CONTRACT.md). */
@Serializable
data class TrophyBreakdownDto(val bronze: Int, val silver: Int, val gold: Int, val platinum: Int)

@Serializable
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

@Serializable
data class LibraryResponse(val games: List<LibraryGameDto>)

class LibraryApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/library/route.ts en el proyecto Next.js. */
    suspend fun getLibrary(): LibraryResponse =
        c.http.get("api/mobile/library").body()
}
