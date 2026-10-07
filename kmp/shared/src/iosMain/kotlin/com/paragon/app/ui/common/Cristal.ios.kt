package com.paragon.app.ui.common

import platform.UIKit.UIAccessibilityIsReduceTransparencyEnabled

/** Ajustes › Accesibilidad › Pantalla y tamaño de texto › Reducir transparencia. */
actual fun reducirTransparenciaSistema(): Boolean = UIAccessibilityIsReduceTransparencyEnabled()
