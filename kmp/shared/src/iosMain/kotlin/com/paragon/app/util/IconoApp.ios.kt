package com.paragon.app.util

import com.paragon.shared.ContextoPlataforma
import platform.UIKit.UIApplication
import platform.UIKit.alternateIconName
import platform.UIKit.setAlternateIconName
import platform.UIKit.supportsAlternateIcons

// Nombres de los AppIcon-<Nombre> de Assets.xcassets (kmp/iconos/generar.py);
// iOS los conoce por ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES (project.yml).
private val NOMBRES = mapOf("oro" to "AppIcon-Oro", "claro" to "AppIcon-Claro", "neon" to "AppIcon-Neon", "esmeralda" to "AppIcon-Esmeralda")

actual fun iconoAppActual(contexto: ContextoPlataforma): String {
    val nombre = UIApplication.sharedApplication.alternateIconName ?: return ""
    return NOMBRES.entries.firstOrNull { it.value == nombre }?.key ?: ""
}

actual fun cambiarIconoApp(contexto: ContextoPlataforma, clave: String) {
    val app = UIApplication.sharedApplication
    if (!app.supportsAlternateIcons) return
    app.setAlternateIconName(NOMBRES[clave], completionHandler = null)
}

actual val cambiarIconoAvisaAlCerrar: Boolean = false
