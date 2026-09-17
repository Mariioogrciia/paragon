package com.paragon.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Guía de bolsillo offline (Modo Enfoque) — copia local de la ficha completa
 * del juego anclado, para poder ver qué trofeo toca sin cobertura. Los
 * trofeos van como JSON (`trophiesJson`, serializado con el mismo Moshi que
 * ya usa Retrofit) en vez de una tabla normalizada aparte: es una copia de
 * solo lectura salvo por la nota, no algo que se consulte con `WHERE` propio.
 */
@Entity(tableName = "cached_game_detail")
data class CachedGameDetailEntity(
    @PrimaryKey val gameId: String,
    val title: String,
    val coverUrl: String,
    val earnedTrophies: Int,
    val totalTrophies: Int,
    val percent: Int,
    val notes: String,
    val trophiesJson: String,
)

/**
 * Nota privada escrita sin conexión, pendiente de mandar a
 * POST /api/mobile/games/{id}/notes en cuanto vuelva la red — una fila por
 * juego (la última versión sin sincronizar gana, no hace falta un historial).
 */
@Entity(tableName = "pending_notes")
data class PendingNoteEntity(
    @PrimaryKey val gameId: String,
    val notes: String,
)
