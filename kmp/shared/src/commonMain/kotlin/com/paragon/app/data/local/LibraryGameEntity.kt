package com.paragon.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "library_games")
data class LibraryGameEntity(
    @PrimaryKey val id: String,
    val title: String,
    val coverUrl: String,
    val progressPercent: Int,
    val definedTotal: Int,
    val earnedTotal: Int,
    val isPlatinado: Boolean,
    val lastPlayedAt: String?,
    val isPinned: Boolean,
    val playtimeMinutes: Int? = null,
)
