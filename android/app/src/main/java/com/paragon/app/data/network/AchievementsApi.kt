package com.paragon.app.data.network

import retrofit2.http.GET

/** `earnedAt` en ISO — `id`/`name`/`description` ver API-CONTRACT.md (BADGE_DEFINITIONS en components/Badges.tsx, web). */
data class BadgeDto(
    val id: String,
    val name: String,
    val description: String,
    val earnedAt: String,
)

/** `kind`: `"liga_mensual"` | `"liga_privada"`. Solo el ganador absoluto, nunca Top 3. */
data class TrophyCaseAwardDto(
    val kind: String,
    val rank: Int,
    val titulo: String,
    val earnedAt: String,
)

data class AchievementsResponse(
    val badges: List<BadgeDto>,
    val trophyCase: List<TrophyCaseAwardDto>,
)

interface AchievementsApi {
    /** Ver src/app/api/mobile/achievements/route.ts en el proyecto Next.js. */
    @GET("api/mobile/achievements")
    suspend fun getAchievements(): AchievementsResponse
}
