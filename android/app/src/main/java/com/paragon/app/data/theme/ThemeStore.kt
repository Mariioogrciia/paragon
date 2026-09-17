package com.paragon.app.data.theme

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.paragon.app.util.applyLauncherIcon

enum class ThemeMode { SISTEMA, CLARO, OSCURO }
enum class PlatformColor { PARAGON, PLAYSTATION, XBOX, STEAM }

/**
 * Preferencia de tema, persistida en SharedPreferences (mismo patrón que
 * `TokenStore`) y expuesta como estado de Compose (`by mutableStateOf`) para
 * que cambiarla desde Ajustes recomponga `ParagonTheme` al instante, sin
 * tener que reiniciar la Activity.
 */
class ThemeStore(context: Context) {
    private val appContext = context.applicationContext
    private val prefs: SharedPreferences =
        context.getSharedPreferences("paragon_theme", Context.MODE_PRIVATE)

    // Nombre distinto del setter público a propósito: una `var` con
    // `private set` llamada `mode` genera un setter JVM `setMode(...)`, que
    // chocaría con el método público `setMode()` de abajo (mismo nombre,
    // misma firma) — error de "platform declaration clash".
    private var current: ThemeMode by mutableStateOf(loadMode())
    private var currentPlatform: PlatformColor by mutableStateOf(loadPlatform())
    
    // Configuración de Solo Player
    private var isZenModeEnabled by mutableStateOf(prefs.getBoolean(KEY_ZEN_MODE, false))
    private var currentRivalHandle by mutableStateOf(prefs.getString(KEY_RIVAL_HANDLE, null))
    private var currentTargetPlatinums by mutableStateOf(
        if (prefs.contains(KEY_TARGET_PLATINUMS)) prefs.getInt(KEY_TARGET_PLATINUMS, 0) else null
    )

    val mode: ThemeMode get() = current
    val platform: PlatformColor get() = currentPlatform
    val zenMode: Boolean get() = isZenModeEnabled
    val rivalHandle: String? get() = currentRivalHandle
    val targetPlatinums: Int? get() = currentTargetPlatinums

    init {
        // Por si el icono real del launcher se quedó desincronizado de la
        // preferencia guardada (p. ej. una reinstalación, que resetea los
        // <activity-alias> del manifiesto a su estado por defecto) — sin
        // coste real, `setComponentEnabledSetting` con el mismo estado ya
        // puesto no hace nada.
        applyLauncherIcon(appContext, currentPlatform)
    }

    private fun loadMode(): ThemeMode =
        prefs.getString(KEY_MODE, null)?.let { saved ->
            ThemeMode.entries.find { it.name == saved }
        } ?: ThemeMode.SISTEMA

    fun setMode(value: ThemeMode) {
        current = value
        prefs.edit().putString(KEY_MODE, value.name).apply()
    }

    private fun loadPlatform(): PlatformColor =
        prefs.getString(KEY_PLATFORM, null)?.let { saved ->
            PlatformColor.entries.find { it.name == saved }
        } ?: PlatformColor.PARAGON

    fun setPlatform(value: PlatformColor) {
        currentPlatform = value
        prefs.edit().putString(KEY_PLATFORM, value.name).apply()
        applyLauncherIcon(appContext, value)
    }
    
    fun setZenMode(value: Boolean) {
        isZenModeEnabled = value
        prefs.edit().putBoolean(KEY_ZEN_MODE, value).apply()
    }
    
    fun setRivalHandle(value: String?) {
        currentRivalHandle = value
        if (value == null) {
            prefs.edit().remove(KEY_RIVAL_HANDLE).apply()
        } else {
            prefs.edit().putString(KEY_RIVAL_HANDLE, value).apply()
        }
    }

    fun setTargetPlatinums(value: Int?) {
        currentTargetPlatinums = value
        if (value == null) {
            prefs.edit().remove(KEY_TARGET_PLATINUMS).apply()
        } else {
            prefs.edit().putInt(KEY_TARGET_PLATINUMS, value).apply()
        }
    }

    companion object {
        private const val KEY_MODE = "mode"
        private const val KEY_PLATFORM = "platform"
        private const val KEY_ZEN_MODE = "zen_mode"
        private const val KEY_RIVAL_HANDLE = "rival_handle"
        private const val KEY_TARGET_PLATINUMS = "target_platinums"
    }
}
