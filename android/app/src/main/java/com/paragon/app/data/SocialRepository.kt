package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.local.SimpleCacheDao
import com.paragon.app.data.local.SimpleCacheEntity
import com.paragon.app.data.network.AmigoDto
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.LigaDto
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
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
    data class Ok(val data: SocialData, val fromCache: Boolean = false) : SocialResult()
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

private const val CACHE_KEY = "social_data"
private val socialMoshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
private val socialDataAdapter = socialMoshi.adapter(SocialData::class.java)

class SocialRepository(private val tokenStore: TokenStore? = null, private val cacheDao: SimpleCacheDao? = null) {
    /** Red primero, caché de respaldo (mismo patrón que Library/Panel/GameDetail/Feed) — Amigos se quedaba en blanco sin conexión. */
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
            val data = SocialData(amigos, liga)
            cacheDao?.put(SimpleCacheEntity(CACHE_KEY, socialDataAdapter.toJson(data)))
            SocialResult.Ok(data)
        } catch (e: HttpException) {
            cachedSocial() ?: SocialResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            cachedSocial() ?: SocialResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    private suspend fun cachedSocial(): SocialResult.Ok? {
        val json = cacheDao?.get(CACHE_KEY) ?: return null
        val data = try { socialDataAdapter.fromJson(json) } catch (e: Exception) { null } ?: return null
        return SocialResult.Ok(data, fromCache = true)
    }
}
