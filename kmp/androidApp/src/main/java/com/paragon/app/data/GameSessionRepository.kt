package com.paragon.app.data

import com.paragon.app.data.local.GameSessionDao
import com.paragon.app.data.local.GameSessionEntity
import java.util.UUID

/** Una sesión ya terminada, con lo que hace falta para el diario. */
data class GameSession(
    val gameTitle: String,
    val startMillis: Long,
    val endMillis: Long,
    val trofeosConseguidos: Int,
)

private fun GameSessionEntity.toDomain(): GameSession? {
    val fin = endMillis ?: return null
    return GameSession(
        gameTitle = gameTitle,
        startMillis = startMillis,
        endMillis = fin,
        trofeosConseguidos = ((trophiesAtEnd ?: trophiesAtStart) - trophiesAtStart).coerceAtLeast(0),
    )
}

/**
 * Diario de sesiones de juego (Modo Enfoque → "Iniciar/Detener sesión") —
 * 100% local, sin backend detrás: es un cronómetro sobre datos que la app
 * ya tiene (fechas y trofeos), no algo que otro dispositivo necesite ver.
 */
class GameSessionRepository(private val dao: GameSessionDao? = null) {
    suspend fun getActiveSession(): GameSessionEntity? = dao?.getActiveSession()

    /** `trofeosActuales` es el `earnedTrophies` de la ficha en ese momento — la base para medir cuántos caen durante la sesión. */
    suspend fun startSession(gameId: String, gameTitle: String, trofeosActuales: Int) {
        dao?.insert(
            GameSessionEntity(
                id = UUID.randomUUID().toString(),
                gameId = gameId,
                gameTitle = gameTitle,
                startMillis = System.currentTimeMillis(),
                endMillis = null,
                trophiesAtStart = trofeosActuales,
                trophiesAtEnd = null,
            )
        )
    }

    /** Devuelve la sesión ya cerrada (para el aviso "2h 30m, 2 trofeos") o `null` si no había ninguna activa. */
    suspend fun stopActiveSession(trofeosActuales: Int): GameSession? {
        val activa = dao?.getActiveSession() ?: return null
        val fin = System.currentTimeMillis()
        dao.finishSession(activa.id, fin, trofeosActuales)
        return activa.copy(endMillis = fin, trophiesAtEnd = trofeosActuales).toDomain()
    }

    suspend fun getDiario(limit: Int = 30): List<GameSession> =
        dao?.getRecentSessions(limit)?.mapNotNull { it.toDomain() } ?: emptyList()
}
