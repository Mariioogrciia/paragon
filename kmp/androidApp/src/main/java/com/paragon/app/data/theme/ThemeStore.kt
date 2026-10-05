package com.paragon.app.data.theme

import android.content.Context
import com.paragon.app.util.applyLauncherIcon
import com.paragon.app.util.flushPendingDisable
import com.russhwolf.settings.SharedPreferencesSettings

/**
 * La apariencia es común (:shared, ThemeStore); en Android se guarda en las
 * SharedPreferences "paragon_theme" de siempre (las mismas claves: actualizar
 * no cambia la apariencia de nadie).
 */
fun ThemeStore(context: Context): ThemeStore {
    val app = context.applicationContext
    val store = ThemeStore(SharedPreferencesSettings(app.getSharedPreferences("paragon_theme", Context.MODE_PRIVATE)))
    // Icono único (la P): por si estaba activo el de PlayStation/Xbox/Steam
    // de antes. Sin coste si ya está bien. Ver IconSwitcher.kt.
    applyLauncherIcon(app)
    flushPendingDisable(app)
    return store
}
