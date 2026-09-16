package com.paragon.app.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
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
    val isPinned: Boolean?,
    val notes: String?,
    val trophies: List<TrophyDto>,
)

data class GameDetailResponse(val game: GameDetailDto)

data class PinResponse(val pinned: Boolean)
data class ReserveResponse(val reservado: Boolean)
data class NotesRequest(val notes: String)
data class OkResponse(val ok: Boolean)
data class ResyncResponse(val nuevos: Int, val error: String? = null)

interface GamesApi {
    /** Ver src/app/api/mobile/games/[gameId]/route.ts en el proyecto Next.js. */
    @GET("api/mobile/games/{gameId}")
    suspend fun getGameDetail(@Path("gameId") gameId: String): GameDetailResponse

    /** Anclar/desanclar para Modo Enfoque — ver games/[gameId]/pin/route.ts. Sin body. */
    @POST("api/mobile/games/{gameId}/pin")
    suspend fun togglePin(@Path("gameId") gameId: String): PinResponse

    /** Reservar/quitar para el Cerrojo de Hitos — ver games/[gameId]/reserve/route.ts. Sin body. */
    @POST("api/mobile/games/{gameId}/reserve")
    suspend fun toggleReserve(@Path("gameId") gameId: String): ReserveResponse

    /** Nota privada de Modo Enfoque — ver games/[gameId]/notes/route.ts. */
    @POST("api/mobile/games/{gameId}/notes")
    suspend fun saveNotes(@Path("gameId") gameId: String, @Body body: NotesRequest): OkResponse

    /** "¿Ya lo tengo?" de Modo Enfoque — ver games/[gameId]/resync/route.ts. Siempre 200. */
    @POST("api/mobile/games/{gameId}/resync")
    suspend fun resync(@Path("gameId") gameId: String): ResyncResponse
}
