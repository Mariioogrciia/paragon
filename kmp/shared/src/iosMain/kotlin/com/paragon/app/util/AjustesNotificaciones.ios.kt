package com.paragon.app.util

import com.paragon.shared.ContextoPlataforma
import platform.Foundation.NSURL
import platform.UIKit.UIApplication
import platform.UIKit.UIApplicationOpenSettingsURLString

/** Los ajustes de la app en iOS (ahí está "Notificaciones"). */
actual fun abrirAjustesNotificaciones(contexto: ContextoPlataforma) {
    val url = NSURL.URLWithString(UIApplicationOpenSettingsURLString) ?: return
    UIApplication.sharedApplication.openURL(url, options = emptyMap<Any?, Any?>(), completionHandler = null)
}
