package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import retrofit2.HttpException

data class DiaActividad(val dia: String, val trofeos: Int)

data class RachaDetalle(
    val actual: Int,
    val mejor: Int,
    val diasActivos: Int,
    val dias: List<DiaActividad>,
)

sealed class RachaDetalleResult {
    data class Ok(val detalle: RachaDetalle) : RachaDetalleResult()
    data class Error(val message: String) : RachaDetalleResult()
}

class RachaRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getRacha(): RachaDetalleResult {
        val store = tokenStore ?: return RachaDetalleResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.rachaApi(store).getRacha()
            RachaDetalleResult.Ok(
                RachaDetalle(
                    actual = response.actual,
                    mejor = response.mejor,
                    diasActivos = response.diasActivos,
                    dias = response.dias.map { DiaActividad(it.dia, it.trofeos) },
                ),
            )
        } catch (e: HttpException) {
            RachaDetalleResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            RachaDetalleResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }
}
