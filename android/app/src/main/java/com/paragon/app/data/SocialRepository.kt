package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.AmigoDto
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.LigaDto
import retrofit2.HttpException

/** Amigos y Liga (SocialScreen) — DOS conceptos distintos, ver GET /api/mobile/social en API-CONTRACT.md. */
data class AmigoCuenta(val platform: String, val username: String)

data class AmigoRow(
    val userId: String,
    val name: String,
    val handle: String?,
    val level: Int,
    val platinos: Int,
    val accounts: List<AmigoCuenta> = emptyList(),
)

data class LigaRow(
    val userId: String,
    val name: String,
    val handle: String?,
    val points: Int,
)

data class SocialData(val amigos: List<AmigoRow>, val liga: List<LigaRow>)

sealed class SocialResult {
    data class Ok(val data: SocialData) : SocialResult()
    data class Error(val message: String) : SocialResult()
}

private fun AmigoDto.toAmigoRow() = AmigoRow(
    userId = userId,
    name = name ?: handle ?: "Jugador",
    handle = handle,
    level = trophyLevel ?: 1,
    platinos = platinos,
    accounts = accounts.map { AmigoCuenta(it.platform, it.username) },
)

private fun LigaDto.toLigaRow() = LigaRow(
    userId = userId,
    name = name ?: handle ?: "Jugador",
    handle = handle,
    points = points,
)

class SocialRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getSocial(): SocialResult {
        val store = tokenStore ?: return SocialResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.socialApi(store).getSocial()
            // `amigos` NO llega ordenado por platinos desde el backend
            // (clasificacionAmigos en src/lib/rankings.ts no hace ORDER BY) —
            // `liga` sí (getLigaMensual ordena por puntos). Se ordena aquí
            // para que el número de posición de la pestaña Amigos sea real.
            val amigos = response.amigos.map { it.toAmigoRow() }.sortedByDescending { it.platinos }
            val liga = response.liga.map { it.toLigaRow() }
            SocialResult.Ok(SocialData(amigos, liga))
        } catch (e: HttpException) {
            SocialResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            SocialResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }
}
