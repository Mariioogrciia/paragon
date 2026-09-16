package com.paragon.app.data.network

import retrofit2.http.GET

data class HitoDto(
    val gameId: String,
    val titulo: String,
    val iconUrl: String?,
    val numero: Int,
)

data class MilestoneResponse(val hito: HitoDto?)

interface MilestoneApi {
    /** Ver src/app/api/mobile/milestone/route.ts — null si no hay nada reservado (o ya se platinó solo). */
    @GET("api/mobile/milestone")
    suspend fun getMilestone(): MilestoneResponse
}
