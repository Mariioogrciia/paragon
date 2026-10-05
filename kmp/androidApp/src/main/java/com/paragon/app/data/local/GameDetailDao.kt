package com.paragon.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface GameDetailDao {
    @Query("SELECT * FROM cached_game_detail WHERE gameId = :gameId LIMIT 1")
    suspend fun getCachedDetail(gameId: String): CachedGameDetailEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDetail(entity: CachedGameDetailEntity)

    @Query("UPDATE cached_game_detail SET notes = :notes WHERE gameId = :gameId")
    suspend fun updateCachedNotes(gameId: String, notes: String)

    @Query("SELECT * FROM pending_notes WHERE gameId = :gameId LIMIT 1")
    suspend fun getPendingNote(gameId: String): PendingNoteEntity?

    @Query("SELECT * FROM pending_notes")
    suspend fun getAllPendingNotes(): List<PendingNoteEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertPendingNote(entity: PendingNoteEntity)

    @Query("DELETE FROM pending_notes WHERE gameId = :gameId")
    suspend fun clearPendingNote(gameId: String)
}
