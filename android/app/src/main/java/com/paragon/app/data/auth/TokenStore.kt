package com.paragon.app.data.auth

import android.content.Context
import android.content.SharedPreferences

/**
 * Guarda el sessionToken que entrega /movil/enlazar (ver lib/mobileAuth.ts en
 * el servidor). SharedPreferences normal, no EncryptedSharedPreferences: el
 * riesgo es el mismo que el de una cookie de sesión en cualquier navegador
 * del teléfono. Lo que sí importa (auditoría, 4 oct 2026) es que no salga
 * del teléfono: este archivo está excluido de las copias de seguridad y de
 * la transferencia entre dispositivos (res/xml/backup_rules.xml y
 * data_extraction_rules.xml).
 */
class TokenStore(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("paragon_auth", Context.MODE_PRIVATE)

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_TOKEN, value).apply()

    /** Clave del login en curso (ver EnlaceSeguro). */
    var pendingLoginKey: String?
        get() = prefs.getString(KEY_PENDING, null)
        set(value) = prefs.edit().putString(KEY_PENDING, value).apply()

    /** Último token de FCM registrado en el servidor, para desasociarlo al cerrar sesión. */
    var fcmToken: String?
        get() = prefs.getString(KEY_FCM, null)
        set(value) = prefs.edit().putString(KEY_FCM, value).apply()

    fun clear() = prefs.edit().remove(KEY_TOKEN).remove(KEY_PENDING).apply()

    companion object {
        private const val KEY_TOKEN = "session_token"
        private const val KEY_PENDING = "pending_login_key"
        private const val KEY_FCM = "fcm_token"
    }
}
