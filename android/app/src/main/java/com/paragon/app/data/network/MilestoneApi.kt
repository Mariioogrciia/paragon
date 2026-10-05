package com.paragon.app.data.network

import retrofit2.http.GET

data class HitoDto(
    val gameId: String,
    val titulo: String,
    val iconUrl: String?,
    val numero: Int,
)

/** Próximo hito redondo (#25, #50...) y cuántos platinos faltan hasta él, el hito incluido. */
data class ProximoHitoDto(val numero: Int, val faltan: Int)

data class MilestoneResponse(val hito: HitoDto?, val proximo: ProximoHitoDto? = null)

interface MilestoneApi {
    /** Ver src/app/api/mobile/milestone/route.ts — null si no hay nada reservado (o ya se platinó solo). */
    @GET("api/mobile/milestone")
    suspend fun getMilestone(): MilestoneResponse
}
