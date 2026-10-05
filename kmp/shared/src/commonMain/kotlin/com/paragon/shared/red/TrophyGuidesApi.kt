package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
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
@Serializable
data class TrophyGuidesResponse(val guides: List<TrophyGuideRowDto>, val currentUserId: String?)
@Serializable
data class SaveTrophyGuideRequest(val body: String)

/** Guías escritas de un trofeo — ver games/[gameId]/trophies/[trophyId]/guides/route.ts en el proyecto Next.js. */
class TrophyGuidesApi internal constructor(private val c: ClienteParagon) {
    suspend fun getGuides(gameId: String, trophyId: String): TrophyGuidesResponse =
        c.http.get("api/mobile/games/${gameId.encodeURLPathPart()}/trophies/${trophyId.encodeURLPathPart()}/guides").body()

    suspend fun saveGuide(gameId: String, trophyId: String, request: SaveTrophyGuideRequest) {
        c.http.post("api/mobile/games/${gameId.encodeURLPathPart()}/trophies/${trophyId.encodeURLPathPart()}/guides") { json(request) }
    }

    suspend fun deleteGuide(gameId: String, trophyId: String) {
        c.http.delete("api/mobile/games/${gameId.encodeURLPathPart()}/trophies/${trophyId.encodeURLPathPart()}/guides")
    }
}
