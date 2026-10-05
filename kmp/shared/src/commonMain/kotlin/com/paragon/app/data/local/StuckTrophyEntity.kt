package com.paragon.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "stuck_trophies")
data class StuckTrophyEntity(
    @PrimaryKey val trophyId: String,
    val gameId: String,
    val gameTitle: String,
    val trophyName: String,
    val trophyDetail: String,
    val trophyGrade: String?, // "PLATINUM", "GOLD", "SILVER", "BRONZE"
    val coverUrl: String,
    val addedAt: Long = System.currentTimeMillis()
)
