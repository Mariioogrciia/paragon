package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

// Sin @JsonClass(generateAdapter = true) — mismo motivo que PanelApi.kt: sin
// kapt montado, KotlinJsonAdapterFactory (reflexión) lee estas data class
// directamente.
@Serializable
data class TrophyDto(
    val id: String,
    val name: String,
    val detail: String,
    val grade: String?,
    val earned: Boolean,
    val earnedAt: String?,
    val rarityPercent: Double?,
    val iconUrl: String?,
)

@Serializable
data class GameDetailDto(
    val id: String,
    val platform: String,
    val title: String,
    val iconUrl: String?,
    val progressPercent: Int,
    val definedTotal: Int,
    val earnedTotal: Int,
    val isPinned: Boolean?,
    val notes: String?,
    val playtimeMinutes: Int?,
    val trophies: List<TrophyDto>,
)

@Serializable
data class GameDetailResponse(val game: GameDetailDto)

@Serializable
data class PinResponse(val pinned: Boolean)
@Serializable
data class ReserveResponse(val reservado: Boolean)
@Serializable
data class NotesRequest(val notes: String)
@Serializable
data class OkResponse(val ok: Boolean)
// `platinoNuevo` viene null salvo que esta llamada haya descubierto un
// platino de verdad nuevo (no en la primera sincronización) — para la
// celebración en el momento en Modo Enfoque/Ficha de juego.
@Serializable
data class PlatinoNuevoDto(val nombre: String, val iconUrl: String?)
@Serializable
data class ResyncResponse(val nuevos: Int, val error: String? = null, val platinoNuevo: PlatinoNuevoDto? = null)
@Serializable
data class TrophyGuideResponse(val videoId: String?)

class GamesApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/games/[gameId]/route.ts en el proyecto Next.js. */
    suspend fun getGameDetail(gameId: String): GameDetailResponse =
        c.http.get("api/mobile/games/${gameId.encodeURLPathPart()}").body()

    /** Anclar/desanclar para Modo Enfoque — ver games/[gameId]/pin/route.ts. Sin body. */
    suspend fun togglePin(gameId: String): PinResponse =
        c.http.post("api/mobile/games/${gameId.encodeURLPathPart()}/pin").body()

    /** Reservar/quitar para el Cerrojo de Hitos — ver games/[gameId]/reserve/route.ts. Sin body. */
    suspend fun toggleReserve(gameId: String): ReserveResponse =
        c.http.post("api/mobile/games/${gameId.encodeURLPathPart()}/reserve").body()

    /** Nota privada de Modo Enfoque — ver games/[gameId]/notes/route.ts. */
    suspend fun saveNotes(gameId: String, body: NotesRequest): OkResponse =
        c.http.post("api/mobile/games/${gameId.encodeURLPathPart()}/notes") { json(body) }.body()

    /** "¿Ya lo tengo?" de Modo Enfoque — ver games/[gameId]/resync/route.ts. Siempre 200. */
    suspend fun resync(gameId: String): ResyncResponse =
        c.http.post("api/mobile/games/${gameId.encodeURLPathPart()}/resync").body()

    /** Vídeo de guía cacheado (mismo dato que la web) — ver games/[gameId]/trophies/[trophyId]/guide/route.ts. */
    suspend fun getTrophyGuide(gameId: String, trophyId: String): TrophyGuideResponse =
        c.http.get("api/mobile/games/${gameId.encodeURLPathPart()}/trophies/${trophyId.encodeURLPathPart()}/guide").body()
}
