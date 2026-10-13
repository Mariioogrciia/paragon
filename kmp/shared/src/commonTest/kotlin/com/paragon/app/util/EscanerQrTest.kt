package com.paragon.app.util

import com.paragon.shared.BASE_URL
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class EscanerQrTest {
    @Test
    fun entiendeLosEnlacesQueGeneramos() {
        assertEquals(DestinoQr.Perfil("mario_gg"), interpretarQr(enlacePerfil("mario_gg")))
        assertEquals(DestinoQr.Sesion("abc123"), interpretarQr(enlaceSesion("abc123")))
    }

    @Test
    fun aguantaVariantesDelMismoEnlace() {
        assertEquals(DestinoQr.Perfil("mario"), interpretarQr("  $BASE_URL/u/@mario/?ref=qr#x "))
        assertEquals(DestinoQr.Perfil("mario"), interpretarQr("paragon://u/mario"))
        assertEquals(DestinoQr.Sesion("s1"), interpretarQr("https://otro-dominio.app/sesiones/s1"))
    }

    @Test
    fun loQueNoEsDeParagonDaNull() {
        assertNull(interpretarQr("https://google.com/busqueda"))
        assertNull(interpretarQr("texto cualquiera"))
        assertNull(interpretarQr("$BASE_URL/u/"))
    }
}
