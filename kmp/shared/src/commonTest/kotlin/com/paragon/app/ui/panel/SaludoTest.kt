package com.paragon.app.ui.panel

import kotlin.test.Test
import kotlin.test.assertEquals

class SaludoTest {
    @Test
    fun primeraPalabraSalvoArticulos() {
        assertEquals("Mario", nombreParaSaludar("Mario García"))
        assertEquals("La Greña", nombreParaSaludar("La Greña"))
        assertEquals("El Pirata", nombreParaSaludar("  El Pirata "))
        assertEquals("Jo Ann", nombreParaSaludar("Jo Ann"))
        assertEquals("nerea", nombreParaSaludar("nerea"))
    }
}
