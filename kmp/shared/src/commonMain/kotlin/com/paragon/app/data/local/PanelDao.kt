package com.paragon.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface PanelDao {
    @Query("SELECT * FROM panel_cache WHERE id = 1 LIMIT 1")
    suspend fun getCached(): PanelCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: PanelCacheEntity)
}
