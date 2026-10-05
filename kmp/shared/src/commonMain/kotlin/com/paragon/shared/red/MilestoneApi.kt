package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class HitoDto(
    val gameId: String,
    val titulo: String,
    val iconUrl: String?,
    val numero: Int,
)

/** Próximo hito redondo (#25, #50...) y cuántos platinos faltan hasta él, el hito incluido. */
@Serializable
data class ProximoHitoDto(val numero: Int, val faltan: Int)

@Serializable
data class MilestoneResponse(val hito: HitoDto?, val proximo: ProximoHitoDto? = null)

class MilestoneApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/milestone/route.ts — null si no hay nada reservado (o ya se platinó solo). */
    suspend fun getMilestone(): MilestoneResponse =
        c.http.get("api/mobile/milestone").body()
}
