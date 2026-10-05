package com.paragon.app.data.network

import retrofit2.http.GET

data class DiaActividadDto(val dia: String, val trofeos: Int)

data class RachaDetalleDto(
    val actual: Int,
    val mejor: Int,
    val diasActivos: Int,
    val dias: List<DiaActividadDto>,
)

interface RachaApi {
    /** Ver src/app/api/mobile/racha/route.ts — detalle para la pantalla dedicada, no el resumen del Panel. */
    @GET("api/mobile/racha")
    suspend fun getRacha(): RachaDetalleDto
}
