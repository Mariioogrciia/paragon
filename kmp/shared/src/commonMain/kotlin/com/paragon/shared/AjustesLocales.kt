package com.paragon.shared

import com.russhwolf.settings.Settings

/**
 * Preferencias locales con nombre, solo de este teléfono: SharedPreferences
 * con ese nombre en Android (las mismas de siempre), NSUserDefaults con ese
 * nombre de suite en iOS.
 */
expect fun ajustesLocales(contexto: ContextoPlataforma, nombre: String): Settings
