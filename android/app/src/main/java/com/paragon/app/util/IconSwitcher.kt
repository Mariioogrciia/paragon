package com.paragon.app.util

import android.app.ActivityManager
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

private const val PREFS_NAME = "paragon_icon_switcher"
private const val KEY_PENDING_DISABLE = "pending_disable_alias"

/**
 * El alias que lanzó la tarea actualmente en primer plano de esta app, si
 * hay alguna — `null` si no se puede saber (p. ej. la app ni siquiera tiene
 * una tarea propia todavía) o si no coincide con ninguno de nuestros 4
 * alias. `getAppTasks()` solo devuelve tareas de la propia app, no hace
 * falta ningún permiso especial.
 */
private fun currentForegroundAlias(context: Context): String? {
    val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return null
    val base = am.appTasks.firstOrNull()?.taskInfo?.baseActivity?.className ?: return null
    return ALIAS_BY_PLATFORM.values.firstOrNull { it == base }
}

/**
 * Cambia el icono real de la app en el launcher del sistema según el tema
 * de plataforma elegido en Ajustes → Apariencia. Android no deja cambiar
 * `android:icon` de una actividad en caliente — la técnica real es tener 4
 * `<activity-alias>` del mismo ComposeMainActivity (ver AndroidManifest.xml),
 * cada uno con su propio icono, y activar solo uno a la vez con
 * `setComponentEnabledSetting`.
 *
 * Quirk real de Android (esto es justo lo que cerraba la app entera al
 * cambiar de tema): deshabilitar el alias que lanzó la TAREA que está en
 * primer plano ahora mismo hace que ActivityManager cierre esa tarea de
 * todos modos, aunque se use `DONT_KILL_APP` (eso solo evita que mate el
 * PROCESO, no que destruya la Activity cuyo componente acaba de
 * deshabilitarse). Por eso, si el alias que tocaría apagar es justo el que
 * nos ha traído hasta aquí, no se apaga ahora — se deja anotado en
 * `PREFS_NAME` y `flushPendingDisable` lo termina más tarde, cuando ya no
 * hay ninguna Activity viva usándolo (ver `ComposeMainActivity.onStop` y
 * `ThemeStore.init`).
 */
fun applyLauncherIcon(context: Context, platform: PlatformColor) {
    val pm = context.packageManager
    val activeAlias = ALIAS_BY_PLATFORM.getValue(platform)
    val foregroundAlias = currentForegroundAlias(context)
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    ALIAS_BY_PLATFORM.values.forEach { alias ->
        if (alias == activeAlias) {
            setAliasEnabled(pm, context, alias, true)
            if (prefs.getString(KEY_PENDING_DISABLE, null) == alias) {
                prefs.edit().remove(KEY_PENDING_DISABLE).apply()
            }
            return@forEach
        }
        if (alias == foregroundAlias) {
            // Es justo el que nos trajo aquí — no lo tocamos todavía.
            prefs.edit().putString(KEY_PENDING_DISABLE, alias).apply()
        } else {
            setAliasEnabled(pm, context, alias, false)
        }
    }
}

/**
 * Termina de apagar el alias que quedó pendiente en `applyLauncherIcon`
 * (si hay uno), ahora que ya no está de fondo en ninguna Activity viva —
 * se llama al perder el primer plano (`onStop`) y en cada arranque en frío
 * (`ThemeStore.init`), sin coste si no hay nada pendiente.
 */
fun flushPendingDisable(context: Context) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val pending = prefs.getString(KEY_PENDING_DISABLE, null) ?: return
    if (pending == currentForegroundAlias(context)) return
    setAliasEnabled(context.packageManager, context, pending, false)
    prefs.edit().remove(KEY_PENDING_DISABLE).apply()
}

private fun setAliasEnabled(pm: PackageManager, context: Context, alias: String, enabled: Boolean) {
    val state = if (enabled) {
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
