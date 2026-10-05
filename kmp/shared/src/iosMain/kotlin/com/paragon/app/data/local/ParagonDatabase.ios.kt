package com.paragon.app.data.local

import androidx.room.Room
import androidx.room.RoomDatabase
import com.paragon.shared.ContextoPlataforma
import kotlinx.cinterop.ExperimentalForeignApi
import platform.Foundation.NSDocumentDirectory
import platform.Foundation.NSFileManager
import platform.Foundation.NSUserDomainMask

// En la carpeta Documents de la app (no se borra como la de cachés).
@OptIn(ExperimentalForeignApi::class)
internal actual fun constructorDeBase(context: ContextoPlataforma, nombre: String): RoomDatabase.Builder<ParagonDatabase> {
    val documentos = NSFileManager.defaultManager.URLForDirectory(
        directory = NSDocumentDirectory,
        inDomain = NSUserDomainMask,
        appropriateForURL = null,
        create = true,
        error = null,
    )
    return Room.databaseBuilder<ParagonDatabase>(name = requireNotNull(documentos?.path) + "/$nombre")
}
