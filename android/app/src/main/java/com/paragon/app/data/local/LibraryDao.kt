package com.paragon.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface LibraryDao {
    @Query("SELECT * FROM library_games")
    suspend fun getAllGames(): List<LibraryGameEntity>

    @Query("SELECT * FROM library_games")
    fun observeAllGames(): Flow<List<LibraryGameEntity>>

    @Query("SELECT * FROM library_games WHERE isPinned = 1 LIMIT 1")
    suspend fun getPinnedGame(): LibraryGameEntity?

    @Query("SELECT * FROM library_games WHERE isPinned = 1 LIMIT 1")
    fun observePinnedGame(): Flow<LibraryGameEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(games: List<LibraryGameEntity>)

    @Query("DELETE FROM library_games")
    suspend fun deleteAll()
}
