package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class WrapTopGenreDto(val name: String, val count: Int)
@Serializable
data class WrapTopGameDto(val id: String, val title: String, val iconUrl: String?, val horasTotal: Double, val earnedTrophies: Int)
@Serializable
data class WrapMejorMesDto(val mes: String, val total: Int)
@Serializable
data class WrapRachasDto(val actual: Int, val mejor: Int, val diasActivos: Int, val hoyCuenta: Boolean)
@Serializable
data class WrapPercentilDto(val percentil: Int, val totalUsuarios: Int, val miTotal: Int)

@Serializable
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
class WrapApi internal constructor(private val c: ClienteParagon) {
    suspend fun getWrap(): WrapResponse =
        c.http.get("api/mobile/wrap").body()
}
