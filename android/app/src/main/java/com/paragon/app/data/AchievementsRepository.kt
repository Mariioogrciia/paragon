package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import retrofit2.HttpException

/**
 * Palmarés (ligas ganadas) + Badges — GET /api/mobile/achievements, ver
 * API-CONTRACT.md. Sin caché local a propósito: son datos de solo lectura,
 * pequeños, y la mayoría de cuentas todavía no tienen ninguno de los dos —
 * un fallo de red aquí no debe bloquear el resto de Estadísticas (ver cómo
 * lo llama StatsScreen, en paralelo con getStats(), no antes ni después).
 */
data class Badge(val id: String, val name: String, val description: String, val earnedAt: String)
data class TrophyCaseAward(val kind: String, val rank: Int, val titulo: String, val earnedAt: String)

sealed class AchievementsResult {
    data class Ok(val badges: List<Badge>, val trophyCase: List<TrophyCaseAward>) : AchievementsResult()
    data class Error(val message: String) : AchievementsResult()
}

class AchievementsRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getAchievements(): AchievementsResult {
        val store = tokenStore ?: return AchievementsResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.achievementsApi(store).getAchievements()
            AchievementsResult.Ok(
                badges = response.badges.map { Badge(it.id, it.name, it.description, it.earnedAt) },
                trophyCase = response.trophyCase.map { TrophyCaseAward(it.kind, it.rank, it.titulo, it.earnedAt) },
            )
        } catch (e: HttpException) {
            AchievementsResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            AchievementsResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }
}
