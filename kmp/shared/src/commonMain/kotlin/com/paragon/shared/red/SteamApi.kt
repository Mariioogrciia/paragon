package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

/** Un lote de logros de Steam traídos y cuántos juegos siguen sin ellos (ver /api/mobile/steam/completar). */
@Serializable
data class ProgresoSteamDto(val hechos: Int, val restantes: Int)

class SteamApi internal constructor(private val c: ClienteParagon) {
    suspend fun completar(): ProgresoSteamDto =
        c.http.post("api/mobile/steam/completar").body()
}
