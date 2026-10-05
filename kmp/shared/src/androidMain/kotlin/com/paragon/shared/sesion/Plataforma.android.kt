package com.paragon.shared.sesion

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import com.paragon.shared.ContextoPlataforma
import com.russhwolf.settings.SharedPreferencesSettings

actual fun crearTokenStore(contexto: ContextoPlataforma): TokenStore =
    TokenStore(SharedPreferencesSettings(contexto.applicationContext.getSharedPreferences("paragon_auth", Context.MODE_PRIVATE)))

actual fun abrirLoginEnNavegador(contexto: ContextoPlataforma, tokenStore: TokenStore, provider: String) {
    val url = EnlaceSeguro.urlLogin(tokenStore, provider)
    CustomTabsIntent.Builder().build().launchUrl(contexto, Uri.parse(url))
}
