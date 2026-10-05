package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient

data class DietaJuego(val gameId: String, val titulo: String)
data class DietaGamer(val genero: String, val juegos: List<DietaJuego>, val horasTotales: Int)

/** "Dieta Gamer" — GET /api/mobile/diet, ver API-CONTRACT.md. */
class DietRepository(private val tokenStore: TokenStore? = null) {
    /** `null` la mayoría de las veces (no aplica) — también si falla la llamada, no hay nada mejor que no enseñar la tarjeta. */
    suspend fun getDiet(): DietaGamer? {
        val store = tokenStore ?: return null
        return try {
            ApiClient.dietApi(store).getDiet().dieta?.let { dto ->
                DietaGamer(dto.genero, dto.juegos.map { DietaJuego(it.gameId, it.titulo) }, dto.horasTotales)
            }
        } catch (e: Exception) {
            null
        }
    }
}
