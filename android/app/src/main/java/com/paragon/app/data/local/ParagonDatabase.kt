package com.paragon.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [LibraryGameEntity::class, CachedGameDetailEntity::class, PendingNoteEntity::class, StuckTrophyEntity::class, PanelCacheEntity::class],
    version = 5,
    exportSchema = false,
)
abstract class ParagonDatabase : RoomDatabase() {
    abstract fun libraryDao(): LibraryDao
    abstract fun gameDetailDao(): GameDetailDao
    abstract fun stuckTrophyDao(): StuckTrophyDao
    abstract fun panelDao(): PanelDao

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
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
