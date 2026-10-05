package com.paragon.app.data.local

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query

/**
 * Caché clave-valor genérica, JSON en bruto — para listas de solo lectura
 * (Comunidad, Amigos, Mis Ligas) que no necesitan ni merecen su propia
 * tabla normalizada: son una copia de respaldo para cuando falla la red,
 * nunca se consultan con `WHERE` propio. Mismo criterio que
 * `CachedGameDetailEntity.trophiesJson`, generalizado — evita tres
 * entidades casi idénticas para tres pantallas distintas.
 */
@Entity(tableName = "simple_cache")
data class SimpleCacheEntity(
    @PrimaryKey val key: String,
    val json: String,
)

@Dao
interface SimpleCacheDao {
    @Query("SELECT json FROM simple_cache WHERE key = :key LIMIT 1")
    suspend fun get(key: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun put(entity: SimpleCacheEntity)
}
