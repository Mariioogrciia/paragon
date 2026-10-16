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

/** "¿Lo compartes?" tras un platino nuevo — ver api/mobile/platino-por-compartir/route.ts. */
@Serializable
data class PlatinoPorCompartirDto(
    val gameId: String,
    val titulo: String,
    val coverUrl: String? = null,
    val earnedTotal: Int = 0,
    val definedTotal: Int = 0,
)

@Serializable
data class PlatinoPorCompartirResponse(val pendiente: PlatinoPorCompartirDto? = null)

@Serializable
data class PlatinoPreguntadoRequest(val gameId: String)

class MilestoneApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/milestone/route.ts — null si no hay nada reservado (o ya se platinó solo). */
    suspend fun getMilestone(): MilestoneResponse =
        c.http.get("api/mobile/milestone").body()

    /** El platino de esta semana por el que aún no se ha preguntado, o `pendiente: null`. */
    suspend fun platinoPorCompartir(): PlatinoPorCompartirResponse =
        c.http.get("api/mobile/platino-por-compartir").body()

    /** Ya se preguntó (compartido o "ahora no"): no vuelve a salir. */
    suspend fun platinoPreguntado(gameId: String): SuccessResponse =
        c.http.post("api/mobile/platino-por-compartir") { json(PlatinoPreguntadoRequest(gameId)) }.body()
}
