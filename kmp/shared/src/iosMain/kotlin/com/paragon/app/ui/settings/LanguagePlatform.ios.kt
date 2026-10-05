package com.paragon.app.ui.settings

import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.idiomaDelSistema
import platform.Foundation.NSUserDefaults

private const val CLAVE_IDIOMA = "paragon_idioma_app"

/**
 * Ajustes → Idioma en iOS: se guarda en el teléfono y se aplica al momento
 * (los textos comunes son estado de Compose: la app se repinta sin
 * reiniciar). "" = el idioma del teléfono.
 */
actual fun setAppLanguage(lang: String) {
    val ajustes = NSUserDefaults.standardUserDefaults
    if (lang.isBlank()) ajustes.removeObjectForKey(CLAVE_IDIOMA) else ajustes.setObject(lang, CLAVE_IDIOMA)
    Textos.idioma = Textos.desdeCodigo(lang.ifBlank { idiomaDelSistema() })
}

actual fun getAppLanguage(): String =
    NSUserDefaults.standardUserDefaults.stringForKey(CLAVE_IDIOMA).orEmpty()

/** Al arrancar la app de iOS: el idioma elegido en Ajustes, si hay uno. */
fun aplicarIdiomaGuardado() {
    val guardado = getAppLanguage()
    if (guardado.isNotBlank()) Textos.idioma = Textos.desdeCodigo(guardado)
}
