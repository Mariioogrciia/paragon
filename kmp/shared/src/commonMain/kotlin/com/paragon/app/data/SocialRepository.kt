package com.paragon.app.data

import com.paragon.shared.red.jsonParagon

import kotlinx.serialization.Serializable

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.local.SimpleCacheDao
import com.paragon.app.data.local.SimpleCacheEntity
import com.paragon.shared.red.AmigoDto
import com.paragon.app.data.network.ApiClient
import com.paragon.shared.red.LigaDto
import com.paragon.shared.red.HttpException
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T

/** Amigos y Liga (SocialScreen) — DOS conceptos distintos, ver GET /api/mobile/social en API-CONTRACT.md. */
@Serializable
data class AmigoCuenta(val platform: String, val username: String)

@Serializable
data class AmigoRow(
    val userId: String,
    val name: String,
    val handle: String?,
    val level: Int,
    val platinos: Int,
    val avatarUrl: String? = null,
    val accounts: List<AmigoCuenta> = emptyList(),
)

@Serializable
data class LigaRow(
    val userId: String,
    val name: String,
    val handle: String?,
    val points: Int,
    val avatarUrl: String? = null,
)

@Serializable
data class SocialData(val amigos: List<AmigoRow>, val liga: List<LigaRow>)

sealed class SocialResult {
    @Serializable
    data class Ok(val data: SocialData, val fromCache: Boolean = false) : SocialResult()
    @Serializable
    data class Error(val message: String) : SocialResult()
}

private fun AmigoDto.toAmigoRow() = AmigoRow(
    userId = userId,
    name = name ?: handle ?: Textos.t(T.comun_jugador),
    handle = handle,
    level = trophyLevel ?: 1,
    platinos = platinos,
    avatarUrl = avatarUrl,
    accounts = accounts.map { AmigoCuenta(it.platform, it.username) },
)

private fun LigaDto.toLigaRow() = LigaRow(
    userId = userId,
    name = name ?: handle ?: Textos.t(T.comun_jugador),
    handle = handle,
    points = points,
    avatarUrl = image,
)

private const val CACHE_KEY = "social_data"

class SocialRepository(private val tokenStore: TokenStore? = null, private val cacheDao: SimpleCacheDao? = null) {
    /** Red primero, caché de respaldo (mismo patrón que Library/Panel/GameDetail/Feed) — Amigos se quedaba en blanco sin conexión. */
    suspend fun getSocial(): SocialResult {
        val store = tokenStore ?: return SocialResult.Error(Textos.t(T.error_sin_sesion))

        return try {
            val response = ApiClient.socialApi(store).getSocial()
            // `amigos` NO llega ordenado por platinos desde el backend
            // (clasificacionAmigos en src/lib/rankings.ts no hace ORDER BY) —
            // `liga` sí (getLigaMensual ordena por puntos). Se ordena aquí
            // para que el número de posición de la pestaña Amigos sea real.
            val amigos = response.amigos.map { it.toAmigoRow() }.sortedByDescending { it.platinos }
            val liga = response.liga.map { it.toLigaRow() }
            val data = SocialData(amigos, liga)
            cacheDao?.put(SimpleCacheEntity(CACHE_KEY, jsonParagon.encodeToString(SocialData.serializer(), data)))
            SocialResult.Ok(data)
        } catch (e: HttpException) {
            cachedSocial() ?: SocialResult.Error(Textos.t(T.error_servidor, e.code()))
        } catch (e: Exception) {
            cachedSocial() ?: SocialResult.Error(Textos.t(T.error_conexion))
        }
    }

    private suspend fun cachedSocial(): SocialResult.Ok? {
        val json = cacheDao?.get(CACHE_KEY) ?: return null
        val data = try { jsonParagon.decodeFromString(SocialData.serializer(), json) } catch (e: Exception) { null } ?: return null
        return SocialResult.Ok(data, fromCache = true)
    }
}
