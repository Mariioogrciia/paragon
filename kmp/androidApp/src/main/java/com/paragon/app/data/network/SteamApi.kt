package com.paragon.app.data.network

import retrofit2.http.POST

/** Un lote de logros de Steam traídos y cuántos juegos siguen sin ellos (ver /api/mobile/steam/completar). */
data class ProgresoSteamDto(val hechos: Int, val restantes: Int)

interface SteamApi {
    @POST("api/mobile/steam/completar")
    suspend fun completar(): ProgresoSteamDto
}
