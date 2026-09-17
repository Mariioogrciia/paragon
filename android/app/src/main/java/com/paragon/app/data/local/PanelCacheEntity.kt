package com.paragon.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Copia local del Panel (perfil + stats + racha) — lo que decide si
 * `AppRoot` deja pasar a `MainScreen` o se queda en la pantalla de error.
 * Antes de esto, sin red la app entera se quedaba bloqueada en el
 * "ErrorGate" aunque Biblioteca/Ficha de juego ya tuvieran su propia caché
 * offline: sin pasar el Panel, nunca se llegaba a verlas.
 *
 * Una sola fila (clave fija) — no tiene sentido guardar el panel de un
 * usuario que no sea el que tiene sesión activa ahora mismo; si cambia de
 * cuenta, la fila se sobrescribe sola en el siguiente `getPanel()` con red.
 */
@Entity(tableName = "panel_cache")
data class PanelCacheEntity(
    @PrimaryKey val id: Int = 1,
    val handle: String,
    val name: String,
    val level: Int,
    val psnId: String,
    val image: String?,
    val platinums: Int,
    val trophies: Int,
    val games: Int,
    val completionRate: Int,
    val rachaActual: Int,
    val rachaMejor: Int,
)
