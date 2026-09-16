package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.HitoDto
import retrofit2.HttpException

/** Cerrojo de Hitos: qué juego está reservado ahora mismo para tu próximo platino en número redondo. */
data class HitoReservado(
    val gameId: String,
    val titulo: String,
    val iconUrl: String?,
    val numero: Int,
)

sealed class MilestoneResult {
    data class Ok(val hito: HitoReservado?) : MilestoneResult()
    data class Error(val message: String) : MilestoneResult()
}

private fun HitoDto.toHitoReservado() = HitoReservado(gameId, titulo, iconUrl, numero)

class MilestoneRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getMilestone(): MilestoneResult {
        val store = tokenStore ?: return MilestoneResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.milestoneApi(store).getMilestone()
            MilestoneResult.Ok(response.hito?.toHitoReservado())
        } catch (e: HttpException) {
            MilestoneResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            MilestoneResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }
}
