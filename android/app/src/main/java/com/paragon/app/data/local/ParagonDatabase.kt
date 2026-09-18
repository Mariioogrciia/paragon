package com.paragon.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [LibraryGameEntity::class, CachedGameDetailEntity::class, PendingNoteEntity::class, StuckTrophyEntity::class, PanelCacheEntity::class, SimpleCacheEntity::class, GameSessionEntity::class],
    version = 7,
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
                    // Sin migraciones definidas todavía (solo tablas de
                    // caché, nada que no se pueda volver a pedir al
                    // servidor) — de la 1 a la 2 basta con recrearla en vez
                    // de escribir un Migration para una tabla que se
                    // rellena sola en la próxima visita a cada pantalla.
                    //
                    // OJO al subir la versión a partir de la 7: game_sessions
                    // (GameSessionEntity) ya NO es caché — es el diario
                    // privado de sesiones del usuario, dato real que no se
                    // puede volver a pedir a ningún servidor. Un
                    // fallbackToDestructiveMigration en una versión futura
                    // borraría ese diario entero sin avisar. A partir de
                    // aquí, cualquier cambio de esquema necesita un
                    // Migration de verdad, no vale recrear la base.
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
