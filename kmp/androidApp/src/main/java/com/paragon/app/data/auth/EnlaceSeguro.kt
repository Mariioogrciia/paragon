package com.paragon.app.data.auth

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

/**
 * Login por Custom Tab con el token cifrado. La clave, la URL y el descifrado
 * son comunes (`com.paragon.shared.sesion.EnlaceSeguro`); aquí solo se abre el
 * navegador de Android.
 */
object EnlaceSeguro {
    /** Abre el login (o la vinculación) de Google/Discord con una clave nueva. */
    fun abrirLogin(context: Context, tokenStore: TokenStore, provider: String) {
        val url = com.paragon.shared.sesion.EnlaceSeguro.urlLogin(tokenStore, provider)
        CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
    }

    /** Token de sesión del enlace `paragon://auth?c=...` (ver la versión común). */
    fun tokenDelEnlace(tokenStore: TokenStore, c: String?): String? =
        com.paragon.shared.sesion.EnlaceSeguro.tokenDelEnlace(tokenStore, c)
}
