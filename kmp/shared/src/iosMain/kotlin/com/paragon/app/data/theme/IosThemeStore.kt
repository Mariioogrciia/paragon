package com.paragon.app.data.theme

import com.russhwolf.settings.NSUserDefaultsSettings
import platform.Foundation.NSUserDefaults

/** La apariencia en iOS: NSUserDefaults propios ("paragon_theme"), como el archivo de Android. */
fun crearThemeStoreIOS(): ThemeStore =
    ThemeStore(NSUserDefaultsSettings(NSUserDefaults(suiteName = "paragon_theme")))
