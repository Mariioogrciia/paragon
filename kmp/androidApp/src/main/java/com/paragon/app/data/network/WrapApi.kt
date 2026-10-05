package com.paragon.app.data.network

import retrofit2.http.GET

data class WrapTopGenreDto(val name: String, val count: Int)
data class WrapTopGameDto(val id: String, val title: String, val iconUrl: String?, val horasTotal: Double, val earnedTrophies: Int)
data class WrapMejorMesDto(val mes: String, val total: Int)
data class WrapRachasDto(val actual: Int, val mejor: Int, val diasActivos: Int, val hoyCuenta: Boolean)
data class WrapPercentilDto(val percentil: Int, val totalUsuarios: Int, val miTotal: Int)

data class WrapResponse(
    val playerName: String,
    val esteAnio: Int,
    val juegosEsteAnio: Int,
    val topGenre: WrapTopGenreDto,
    val topGame: WrapTopGameDto?,
    val mejorMes: WrapMejorMesDto?,
    val rachas: WrapRachasDto,
    val percentil: WrapPercentilDto?,
)

/** Paragon Wrap — ver src/app/api/mobile/wrap/route.ts en el proyecto Next.js. */
interface WrapApi {
    @GET("api/mobile/wrap")
    suspend fun getWrap(): WrapResponse
}
