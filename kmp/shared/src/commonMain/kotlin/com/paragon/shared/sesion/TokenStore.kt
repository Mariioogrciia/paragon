package com.paragon.shared.sesion

import com.russhwolf.settings.Settings

/**
 * Guarda el sessionToken que entrega /movil/enlazar (ver lib/mobileAuth.ts en
 * el servidor) y lo que acompaña al login. El almacén lo pone cada
 * plataforma: en Android, las SharedPreferences "paragon_auth" de siempre
 * (excluidas de las copias de seguridad: res/xml/backup_rules.xml); en iOS,
 * el Llavero.
 */
class TokenStore(private val ajustes: Settings) {
    var token: String?
        get() = ajustes.getStringOrNull(KEY_TOKEN)
        set(value) = guardar(KEY_TOKEN, value)

    /** Clave del login en curso (ver EnlaceSeguro). */
    var pendingLoginKey: String?
        get() = ajustes.getStringOrNull(KEY_PENDING)
        set(value) = guardar(KEY_PENDING, value)

    /** Último token de push registrado en el servidor, para desasociarlo al cerrar sesión. */
    var fcmToken: String?
        get() = ajustes.getStringOrNull(KEY_FCM)
        set(value) = guardar(KEY_FCM, value)

    fun clear() {
        ajustes.remove(KEY_TOKEN)
        ajustes.remove(KEY_PENDING)
    }

    private fun guardar(clave: String, valor: String?) {
        if (valor == null) ajustes.remove(clave) else ajustes.putString(clave, valor)
    }

    private companion object {
        // Las mismas claves que la app Android de antes: actualizar no cierra la sesión.
        const val KEY_TOKEN = "session_token"
        const val KEY_PENDING = "pending_login_key"
        const val KEY_FCM = "fcm_token"
    }
}
