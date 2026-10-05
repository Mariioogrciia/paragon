package com.paragon.shared.i18n

import java.util.Locale

// Con el idioma por app de Android 13+ (Ajustes → Idioma), AppCompat cambia
// también el Locale por defecto del proceso.
actual fun idiomaDelSistema(): String = Locale.getDefault().language
