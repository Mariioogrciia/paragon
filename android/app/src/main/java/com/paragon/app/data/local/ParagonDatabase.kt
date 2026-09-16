package com.paragon.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [LibraryGameEntity::class], version = 1, exportSchema = false)
abstract class ParagonDatabase : RoomDatabase() {
    abstract fun libraryDao(): LibraryDao

    companion object {
        @Volatile
        private var INSTANCE: ParagonDatabase? = null

        fun getDatabase(context: Context): ParagonDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ParagonDatabase::class.java,
                    "paragon_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
