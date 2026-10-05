package com.paragon.app.data.local

import androidx.room.Room
import androidx.room.RoomDatabase
import com.paragon.shared.ContextoPlataforma

// El mismo archivo que usaba la app antes (databases/paragon_database).
internal actual fun constructorDeBase(context: ContextoPlataforma, nombre: String): RoomDatabase.Builder<ParagonDatabase> {
    val app = context.applicationContext
    return Room.databaseBuilder<ParagonDatabase>(app, app.getDatabasePath(nombre).absolutePath)
}
