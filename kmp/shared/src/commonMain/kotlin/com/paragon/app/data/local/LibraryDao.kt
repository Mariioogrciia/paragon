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

    // Nunca hay dos juegos anclados a la vez (mismo criterio que el backend,
    // ver togglePin en GameDetailRepository.kt) — desanclar TODOS antes de
    // anclar uno nuevo es más simple y seguro que buscar cuál era el viejo.
    @Query("UPDATE library_games SET isPinned = 0")
    suspend fun clearPinned()

    @Query("UPDATE library_games SET isPinned = 1 WHERE id = :gameId")
    suspend fun setPinned(gameId: String)
}
