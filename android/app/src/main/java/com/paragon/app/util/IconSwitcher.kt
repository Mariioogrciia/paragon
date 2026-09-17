package com.paragon.app.util

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import com.paragon.app.data.theme.PlatformColor

// Nombres completos de los <activity-alias> del manifiesto — los 4 apuntan
// al mismo ComposeMainActivity, solo cambia su icono de lanzador.
private val ALIAS_BY_PLATFORM = mapOf(
    PlatformColor.PARAGON to "com.paragon.app.IconParagon",
    PlatformColor.PLAYSTATION to "com.paragon.app.IconPlayStation",
    PlatformColor.XBOX to "com.paragon.app.IconXbox",
    PlatformColor.STEAM to "com.paragon.app.IconSteam",
)

/**
 * Cambia el icono real de la app en el launcher del sistema según el tema
 * de plataforma elegido en Ajustes → Apariencia. Android no deja cambiar
 * `android:icon` de una actividad en caliente — la técnica real es tener 4
 * `<activity-alias>` del mismo ComposeMainActivity (ver AndroidManifest.xml),
 * cada uno con su propio icono, y activar solo uno a la vez con
 * `setComponentEnabledSetting`. `DONT_KILL_APP` evita que el sistema mate
 * la app al cambiar — el launcher recoge el icono nuevo un instante después,
 * sin necesidad de reiniciar la sesión actual.
 */
fun applyLauncherIcon(context: Context, platform: PlatformColor) {
    val pm = context.packageManager
    val activeAlias = ALIAS_BY_PLATFORM.getValue(platform)

    ALIAS_BY_PLATFORM.values.forEach { alias ->
        val state = if (alias == activeAlias) {
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        } else {
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        }
        try {
            pm.setComponentEnabledSetting(ComponentName(context.packageName, alias), state, PackageManager.DONT_KILL_APP)
        } catch (e: IllegalArgumentException) {
            // "Activity class {...} does not exist" — pasa si el paquete
            // instalado todavía no tiene estos alias (APK de antes de este
            // cambio, o el sistema aún registrando componentes justo tras
            // instalar/actualizar). Es un detalle cosmético del icono, así
            // que nunca debe tirar abajo el resto de la app — se ignora y
            // se reintentará solo (esto se llama en cada arranque, ver
            // ThemeStore.init) en cuanto el paquete instalado sí los tenga.
        }
    }
}
