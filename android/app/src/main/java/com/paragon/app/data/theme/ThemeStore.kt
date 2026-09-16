package com.paragon.app.data.theme

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

enum class ThemeMode { SISTEMA, CLARO, OSCURO }

/**
 * Preferencia de tema, persistida en SharedPreferences (mismo patrón que
 * `TokenStore`) y expuesta como estado de Compose (`by mutableStateOf`) para
 * que cambiarla desde Ajustes recomponga `ParagonTheme` al instante, sin
 * tener que reiniciar la Activity.
 */
class ThemeStore(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("paragon_theme", Context.MODE_PRIVATE)

    // Nombre distinto del setter público a propósito: una `var` con
    // `private set` llamada `mode` genera un setter JVM `setMode(...)`, que
    // chocaría con el método público `setMode()` de abajo (mismo nombre,
    // misma firma) — error de "platform declaration clash".
    private var current: ThemeMode by mutableStateOf(loadMode())

    val mode: ThemeMode get() = current

    private fun loadMode(): ThemeMode =
        prefs.getString(KEY_MODE, null)?.let { saved ->
            ThemeMode.entries.find { it.name == saved }
        } ?: ThemeMode.SISTEMA

    fun setMode(value: ThemeMode) {
        current = value
        prefs.edit().putString(KEY_MODE, value.name).apply()
    }

    companion object {
        private const val KEY_MODE = "mode"
    }
}
