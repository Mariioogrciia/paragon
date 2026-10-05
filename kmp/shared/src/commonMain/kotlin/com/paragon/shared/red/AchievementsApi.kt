package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

/** `earnedAt` en ISO — `id`/`name`/`description` ver API-CONTRACT.md (BADGE_DEFINITIONS en components/Badges.tsx, web). */
@Serializable
data class BadgeDto(
    val id: String,
    val name: String,
    val description: String,
    val earnedAt: String,
)

/** `kind`: `"liga_mensual"` | `"liga_privada"`. Solo el ganador absoluto, nunca Top 3. */
@Serializable
data class TrophyCaseAwardDto(
    val kind: String,
    val rank: Int,
    val titulo: String,
    val earnedAt: String,
)

@Serializable
data class AchievementsResponse(
    val badges: List<BadgeDto>,
    val trophyCase: List<TrophyCaseAwardDto>,
)

class AchievementsApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/achievements/route.ts en el proyecto Next.js. */
    suspend fun getAchievements(): AchievementsResponse =
        c.http.get("api/mobile/achievements").body()
}
