package com.paragon.shared.sesion

import com.russhwolf.settings.MapSettings
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class EnlaceSeguroTest {
    // Cifrado con el mismo código que src/lib/enlaceMovil.ts (cifrarParaApp).
    private val k = "hFLkquvCeZQ0ScovZhZ2PV0VMXgXMVFFk-wWxac14CI"
    private val c = "gN538oISfbD5eVDvB7o0OMhDtQWfwfroDJh0VFSsRZ--SBVi0BeRLGetABYtOQ"

    @Test
    fun descifraLoQueCifraElServidor() {
        val tokens = TokenStore(MapSettings())
        tokens.pendingLoginKey = k
        assertEquals("token-de-prueba-ñ", EnlaceSeguro.tokenDelEnlace(tokens, c))
        // La clave se gasta al usarla.
        assertNull(tokens.pendingLoginKey)
    }

    @Test
    fun ignoraUnEnlaceFalsoSinGastarLaClave() {
        val tokens = TokenStore(MapSettings())
        tokens.pendingLoginKey = k
        assertNull(EnlaceSeguro.tokenDelEnlace(tokens, c.reversed()))
        assertEquals(k, tokens.pendingLoginKey)
    }

    @Test
    fun laClaveTieneElFormatoQuePideElServidor() {
        val tokens = TokenStore(MapSettings())
        val url = EnlaceSeguro.urlLogin(tokens, "discord")
        // CLAVE_RE de enlaceMovil.ts: 43 caracteres base64url.
        assertTrue(Regex("^[A-Za-z0-9_-]{43}$").matches(tokens.pendingLoginKey!!))
        assertEquals("https://platinos-nine.vercel.app/movil/entrar/discord?k=${tokens.pendingLoginKey}", url)
    }
}
