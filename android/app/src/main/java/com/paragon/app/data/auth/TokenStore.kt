package com.paragon.app.data.auth

import android.content.Context
import android.content.SharedPreferences

/**
 * Guarda el sessionToken que entrega /movil/enlazar (el mismo que Auth.js usa
 * como cookie en la web — ver lib/mobileAuth.ts en el servidor). SharedPreferences
 * normal a propósito, no EncryptedSharedPreferences: el riesgo es el mismo que el
 * de una cookie de sesión en cualquier navegador del teléfono, no hace falta más
 * para una app de unos pocos usuarios reales.
 */
class TokenStore(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("paragon_auth", Context.MODE_PRIVATE)

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_TOKEN, value).apply()

    fun clear() = prefs.edit().remove(KEY_TOKEN).apply()

    companion object {
        private const val KEY_TOKEN = "session_token"
    }
}
