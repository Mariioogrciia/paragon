package com.paragon.app.data

import com.paragon.app.AppIOS
import com.paragon.app.GRUPO_APP
import com.paragon.app.data.local.ParagonDatabase
import com.paragon.shared.ContextoIOS
import com.paragon.shared.ContextoPlataforma
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import platform.Foundation.NSUserDefaults

/**
 * El widget de iOS (ParagonWidget, en Swift) no puede abrir la base de Room:
 * lee lo que deja aquí la app en el App Group, con los textos ya en el
 * idioma de la app, y WidgetKit lo vuelve a pintar con `recargar()`. Mismo
 * contenido que el widget de Android (PinnedGameWidget.kt): el juego
 * anclado y su progreso.
 */
actual fun notifyWidgetUpdate(context: ContextoPlataforma?) {
    MainScope().launch {
        val juego = try {
            ParagonDatabase.getDatabase(ContextoIOS).libraryDao().getPinnedGame()
        } catch (e: Exception) {
            return@launch
        }
        val datos = NSUserDefaults(suiteName = GRUPO_APP)
        if (juego != null) {
            datos.setBool(true, forKey = "widget_hay")
            datos.setObject(Textos.t(T.widget_objetivo, juego.title), forKey = "widget_titulo")
            datos.setObject(
                Textos.t(T.ficha_progreso, juego.earnedTotal, juego.definedTotal, juego.progressPercent),
                forKey = "widget_detalle",
            )
            datos.setDouble(juego.progressPercent / 100.0, forKey = "widget_progreso")
        } else {
            datos.setBool(false, forKey = "widget_hay")
            datos.setObject(Textos.t(T.widget_sin_objetivo), forKey = "widget_titulo")
            datos.setObject(Textos.t(T.widget_sin_objetivo_sub), forKey = "widget_detalle")
            datos.setDouble(0.0, forKey = "widget_progreso")
        }
        AppIOS.widget?.recargar()
    }
}
