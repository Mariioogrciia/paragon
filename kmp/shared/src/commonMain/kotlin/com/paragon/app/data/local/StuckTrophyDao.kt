package com.paragon.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface StuckTrophyDao {
    @Query("SELECT * FROM stuck_trophies ORDER BY addedAt DESC")
    suspend fun getAllStuckTrophies(): List<StuckTrophyEntity>

    @Query("SELECT EXISTS(SELECT 1 FROM stuck_trophies WHERE trophyId = :trophyId)")
    suspend fun isStuck(trophyId: String): Boolean

    /**
     * Todos los `trophyId` atascados de golpe — antes `GameDetailScreen`
     * llamaba a `isStuck(trophy.id)` UNA VEZ POR FILA (un `LaunchedEffect`
     * por trofeo), disparando tantas queries Room como trofeos tenga el
     * juego. Una sola consulta a nivel de pantalla, convertida a `Set` allí.
     */
    @Query("SELECT trophyId FROM stuck_trophies")
    suspend fun getAllStuckIds(): List<String>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun addStuckTrophy(trophy: StuckTrophyEntity)

    @Query("DELETE FROM stuck_trophies WHERE trophyId = :trophyId")
    suspend fun removeStuckTrophy(trophyId: String)
}
