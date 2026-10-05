package com.paragon.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * Añade el desglose por metal (oro/plata/bronce) a la caché del Panel —
 * antes la app pintaba esto con datos de prueba fijos porque el backend no
 * los exponía; ya los expone (GET /api/mobile/panel), así que la caché
 * necesita sitio para guardarlos. `panel_cache` es solo caché (se rellena
 * sola en la próxima visita si algo sale mal), pero está en la MISMA base
 * que `game_sessions` (dato real, no recuperable) — de ahí el Migration de
 * verdad en vez de `fallbackToDestructiveMigration`, que borraría las dos.
 */
val MIGRATION_7_8 = object : Migration(7, 8) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE panel_cache ADD COLUMN gold INTEGER NOT NULL DEFAULT 0")
        db.execSQL("ALTER TABLE panel_cache ADD COLUMN silver INTEGER NOT NULL DEFAULT 0")
        db.execSQL("ALTER TABLE panel_cache ADD COLUMN bronze INTEGER NOT NULL DEFAULT 0")
    }
}

@Database(
    entities = [LibraryGameEntity::class, CachedGameDetailEntity::class, PendingNoteEntity::class, StuckTrophyEntity::class, PanelCacheEntity::class, SimpleCacheEntity::class, GameSessionEntity::class],
    version = 8,
    exportSchema = false,
)
abstract class ParagonDatabase : RoomDatabase() {
    abstract fun libraryDao(): LibraryDao
    abstract fun gameDetailDao(): GameDetailDao
    abstract fun stuckTrophyDao(): StuckTrophyDao
    abstract fun panelDao(): PanelDao
    abstract fun simpleCacheDao(): SimpleCacheDao
    abstract fun gameSessionDao(): GameSessionDao

    companion object {
        @Volatile
        private var INSTANCE: ParagonDatabase? = null

        fun getDatabase(context: Context): ParagonDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ParagonDatabase::class.java,
                    "paragon_database"
                )
                    // Sin migraciones definidas hasta la v6 (solo tablas de
                    // caché, nada que no se pueda volver a pedir al
                    // servidor) — recrear la base ahí no pierde nada real.
                    //
                    // A partir de la v7, game_sessions (GameSessionEntity) ya
                    // NO es caché — es el diario privado de sesiones del
                    // usuario, dato real que no se puede volver a pedir a
                    // ningún servidor. `fallbackToDestructiveMigrationFrom`
                    // limita el borrado automático a versiones viejas de
                    // verdad sin dato real (1-6); de la 7 en adelante hace
                    // falta un `Migration` explícito en `.addMigrations(...)`
                    // — ver MIGRATION_7_8 más arriba — o Room lanza en vez de
                    // borrar en silencio.
                    .fallbackToDestructiveMigrationFrom(1, 2, 3, 4, 5, 6)
                    .addMigrations(MIGRATION_7_8)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
