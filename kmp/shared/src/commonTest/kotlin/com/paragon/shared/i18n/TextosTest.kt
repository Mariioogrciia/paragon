package com.paragon.shared.i18n

import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals

class TextosTest {
    private val antes = Textos.idioma

    @AfterTest
    fun restaurar() {
        Textos.idioma = antes
    }

    @Test
    fun rellenaLosHuecosEnCadaIdioma() {
        Textos.idioma = Idioma.ES
        assertEquals("El servidor respondió con un error (500).", Textos.t(T.error_servidor, 500))
        Textos.idioma = Idioma.DE
        assertEquals("Der Server hat einen Fehler gemeldet (404).", Textos.t(T.error_servidor, 404))
    }

    @Test
    fun idiomaDesconocidoCaeEnEspanol() {
        assertEquals(Idioma.ES, Textos.desdeCodigo("ja"))
        assertEquals(Idioma.FR, Textos.desdeCodigo("fr-CA"))
        assertEquals(Idioma.EN, Textos.desdeCodigo("EN"))
    }

    @Test
    fun sinArgumentosNoTocaLasLlaves() {
        assertEquals("{0} y {1}", Textos.rellenar("{0} y {1}", emptyArray()))
        assertEquals("a y {1}", Textos.rellenar("{0} y {1}", arrayOf("a")))
    }
}
