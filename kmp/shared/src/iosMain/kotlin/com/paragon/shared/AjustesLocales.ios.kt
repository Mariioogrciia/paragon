package com.paragon.shared

import com.russhwolf.settings.NSUserDefaultsSettings
import com.russhwolf.settings.Settings
import platform.Foundation.NSUserDefaults

actual fun ajustesLocales(contexto: ContextoPlataforma, nombre: String): Settings =
    NSUserDefaultsSettings(NSUserDefaults(suiteName = nombre))
