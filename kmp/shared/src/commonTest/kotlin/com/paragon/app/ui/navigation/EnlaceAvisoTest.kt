package com.paragon.app.ui.navigation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class EnlaceAvisoTest {
    @Test
    fun juegosYSesiones() {
        assertEquals("game/psn:NPWR1_00", rutaAppDeAviso("/juego/psn%3ANPWR1_00", "yo"))
        assertEquals("session/s1", rutaAppDeAviso("/sesiones/s1", "yo"))
        assertEquals(Screen.Sessions.route, rutaAppDeAviso("/sesiones", "yo"))
    }

    @Test
    fun elPlatinoPropioAbreTuFichaYElDeOtroLaSuya() {
        assertEquals("game/steam:10", rutaAppDeAviso("/u/Yo/steam:10", "yo"))
        assertEquals("game/steam:10?de=ana", rutaAppDeAviso("/u/ana/steam:10", "yo"))
        assertEquals("user/ana", rutaAppDeAviso("/u/@ana", "yo"))
    }

    @Test
    fun loSocialVaALaPestanaLigas() {
        assertEquals(Screen.Social.route, rutaAppDeAviso("/amigos", null))
        assertEquals(Screen.Social.route, rutaAppDeAviso("/ligas/abc", null))
        assertEquals(Screen.Social.route, rutaAppDeAviso("https://platinos-nine.vercel.app/clanes/pgn?x=1", null))
    }

    @Test
    fun sinPantallaEquivalenteSeQuedaEnInicio() {
        assertNull(rutaAppDeAviso("/", "yo"))
        assertNull(rutaAppDeAviso("/temporada", "yo"))
        assertNull(rutaAppDeAviso("", "yo"))
    }
}
