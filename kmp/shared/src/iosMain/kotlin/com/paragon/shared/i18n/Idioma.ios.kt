package com.paragon.shared.i18n

import platform.Foundation.NSLocale
import platform.Foundation.preferredLanguages

// El primero de la lista de idiomas preferidos ("es-ES", "en-GB"...).
actual fun idiomaDelSistema(): String =
    (NSLocale.preferredLanguages.firstOrNull() as? String)?.take(2) ?: "es"
