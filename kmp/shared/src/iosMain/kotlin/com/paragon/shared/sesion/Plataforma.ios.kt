package com.paragon.shared.sesion

import com.paragon.shared.ContextoPlataforma
import com.russhwolf.settings.ExperimentalSettingsImplementation
import com.russhwolf.settings.KeychainSettings
import platform.Foundation.NSURL
import platform.UIKit.UIApplication

@OptIn(ExperimentalSettingsImplementation::class)
actual fun crearTokenStore(contexto: ContextoPlataforma): TokenStore =
    TokenStore(KeychainSettings(service = "com.paragon.app.sesion"))

// Safari; la vuelta llega por paragon://auth (CFBundleURLTypes en Info.plist,
// recogida en iOSApp.swift con onOpenURL).
actual fun abrirLoginEnNavegador(contexto: ContextoPlataforma, tokenStore: TokenStore, provider: String) {
    val url = NSURL.URLWithString(EnlaceSeguro.urlLogin(tokenStore, provider)) ?: return
    UIApplication.sharedApplication.openURL(url, options = emptyMap<Any?, Any?>(), completionHandler = null)
}
