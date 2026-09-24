package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient

data class WrapTopGenre(val name: String, val count: Int)
data class WrapTopGame(val id: String, val title: String, val iconUrl: String?, val horasTotal: Double, val earnedTrophies: Int)
data class WrapMejorMes(val mes: String, val total: Int)
data class WrapRachas(val actual: Int, val mejor: Int, val diasActivos: Int, val hoyCuenta: Boolean)
data class WrapPercentil(val percentil: Int, val totalUsuarios: Int, val miTotal: Int)

/**
 * Paragon Wrap — GET /api/mobile/wrap, ver API-CONTRACT.md. Mismo dato que
 * las 3 tarjetas del perfil web MÁS lo que solo tenía sitio en la versión
 * "Stories" ampliada (mejorMes/rachas/percentil).
 */
data class WrapData(
    val playerName: String,
    val esteAnio: Int,
    val juegosEsteAnio: Int,
    val topGenre: WrapTopGenre,
    val topGame: WrapTopGame?,
    val mejorMes: WrapMejorMes?,
    val rachas: WrapRachas,
    val percentil: WrapPercentil?,
)

sealed class WrapResult {
    data class Ok(val data: WrapData) : WrapResult()
    data class Error(val message: String) : WrapResult()
}

class WrapRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getWrap(): WrapResult {
        val store = tokenStore ?: return WrapResult.Error("Sin sesión.")
        return try {
            val dto = ApiClient.wrapApi(store).getWrap()
            WrapResult.Ok(
                WrapData(
                    playerName = dto.playerName,
                    esteAnio = dto.esteAnio,
                    juegosEsteAnio = dto.juegosEsteAnio,
                    topGenre = WrapTopGenre(dto.topGenre.name, dto.topGenre.count),
                    topGame = dto.topGame?.let { WrapTopGame(it.id, it.title, it.iconUrl, it.horasTotal, it.earnedTrophies) },
                    mejorMes = dto.mejorMes?.let { WrapMejorMes(it.mes, it.total) },
                    rachas = WrapRachas(dto.rachas.actual, dto.rachas.mejor, dto.rachas.diasActivos, dto.rachas.hoyCuenta),
                    percentil = dto.percentil?.let { WrapPercentil(it.percentil, it.totalUsuarios, it.miTotal) },
                ),
            )
        } catch (e: Exception) {
            WrapResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }
}
