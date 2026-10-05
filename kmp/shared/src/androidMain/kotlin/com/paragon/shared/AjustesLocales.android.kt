package com.paragon.shared

import android.content.Context
import com.russhwolf.settings.SharedPreferencesSettings
import com.russhwolf.settings.Settings

actual fun ajustesLocales(contexto: ContextoPlataforma, nombre: String): Settings =
    SharedPreferencesSettings(contexto.applicationContext.getSharedPreferences(nombre, Context.MODE_PRIVATE))
