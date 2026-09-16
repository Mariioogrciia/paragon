package com.paragon.app.data.network

import retrofit2.http.GET
import retrofit2.http.Path

data class CompareSideDto(val name: String, val level: Int, val platinos: Int, val trofeos: Int, val juegos: Int)

data class SharedGameDto(
    val id: String,
    val title: String,
    val iconUrl: String?,
    val myPercent: Int,
    val theirPercent: Int,
    val myHours: Double?,
    val theirHours: Double?,
)

data class CompareResponse(
    val me: CompareSideDto,
    val them: CompareSideDto,
    val sharedGames: List<SharedGameDto>,
)

interface CompareApi {
    /** Ver src/app/api/mobile/compare/[handle]/route.ts. 404 si no existe, 409 sin cuentas vinculadas. */
    @GET("api/mobile/compare/{handle}")
    suspend fun compare(@Path("handle") handle: String): CompareResponse
}
