package com.paragon.app.data.local

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query

/**
 * Una sesión de juego (Modo Enfoque → "Iniciar sesión"/"Detener sesión") —
 * el diario privado de cuántas horas de verdad le dedicas a cada platino.
 *
 * `endMillis == null` es la sesión ACTIVA ahora mismo, si hay una — solo
 * puede haber una a la vez (lo garantiza la UI, no una constraint de la
 * tabla: más simple, y aquí el único escritor es el propio usuario tocando
 * un botón). Guardar el timestamp de inicio en vez de un cronómetro en
 * memoria es a propósito: sobrevive a que Android mate el proceso mientras
 * el usuario está jugando al juego DE VERDAD, no a Paragon — la duración se
 * calcula sola al volver, comparando con la hora real.
 */
@Entity(tableName = "game_sessions")
data class GameSessionEntity(
    @PrimaryKey val id: String,
    val gameId: String,
    val gameTitle: String,
    val startMillis: Long,
    val endMillis: Long?,
    val trophiesAtStart: Int,
    val trophiesAtEnd: Int?,
)

@Dao
interface GameSessionDao {
    @Query("SELECT * FROM game_sessions WHERE endMillis IS NULL LIMIT 1")
    suspend fun getActiveSession(): GameSessionEntity?

    @Insert
    suspend fun insert(entity: GameSessionEntity)

    @Query("UPDATE game_sessions SET endMillis = :endMillis, trophiesAtEnd = :trophiesAtEnd WHERE id = :id")
    suspend fun finishSession(id: String, endMillis: Long, trophiesAtEnd: Int)

    @Query("SELECT * FROM game_sessions WHERE endMillis IS NOT NULL ORDER BY startMillis DESC LIMIT :limit")
    suspend fun getRecentSessions(limit: Int): List<GameSessionEntity>
}
