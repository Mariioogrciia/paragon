package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class DiaActividadDto(val dia: String, val trofeos: Int)

@Serializable
data class RachaDetalleDto(
    val actual: Int,
    val mejor: Int,
    val diasActivos: Int,
    val dias: List<DiaActividadDto>,
)

class RachaApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/racha/route.ts — detalle para la pantalla dedicada, no el resumen del Panel. */
    suspend fun getRacha(): RachaDetalleDto =
        c.http.get("api/mobile/racha").body()
}
