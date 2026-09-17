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

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun addStuckTrophy(trophy: StuckTrophyEntity)

    @Query("DELETE FROM stuck_trophies WHERE trophyId = :trophyId")
    suspend fun removeStuckTrophy(trophyId: String)
}
