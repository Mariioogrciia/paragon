package com.paragon.app.data.auth

import android.content.Context
import com.russhwolf.settings.SharedPreferencesSettings

// La sesión es común (:shared, TokenStore); aquí solo dónde se guarda en Android.

/**
 * Las SharedPreferences "paragon_auth" de siempre: las mismas claves que
 * antes, así que actualizar la app no cierra la sesión. Excluidas de las
 * copias de seguridad y de la transferencia entre dispositivos
 * (res/xml/backup_rules.xml y data_extraction_rules.xml).
 */
fun TokenStore(context: Context): TokenStore =
    TokenStore(SharedPreferencesSettings(context.getSharedPreferences("paragon_auth", Context.MODE_PRIVATE)))
