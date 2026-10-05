package com.paragon.shared

/**
 * Vibraciones de la app. La interfaz es común; la implementación de verdad la
 * pone cada plataforma desde fuera (en iOS, `HapticosIOS.swift` con Core
 * Haptics, registrada con `configurarHapticos` al arrancar). Sin registrar,
 * no vibra nada.
 */
interface Hapticos {
    /** `metal`: "bronce", "plata", "oro" o "platino". */
    fun trofeo(metal: String)

    /** Toque ligero para botones y selecciones. */
    fun toque()
}

private object SinHapticos : Hapticos {
    override fun trofeo(metal: String) {}
    override fun toque() {}
}

var hapticos: Hapticos = SinHapticos
    private set

fun configurarHapticos(implementacion: Hapticos) {
    hapticos = implementacion
}
