package com.paragon.app.data

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TiempoTest {
    @Test
    fun formatoIgualQueElServidor() {
        // new Date(1791190906000).toISOString() en Node
        assertEquals("2026-10-05T09:01:46.000Z", millisAIso(1791190906000))
        assertEquals("2026-10-05T09:01:46.120Z", millisAIso(1791190906120))
        assertEquals("2026-10-05T09:01:46.123Z", millisAIso(1791190906123))
    }

    @Test
    fun idaYVuelta() {
        assertEquals(1791190906123, isoAMillis("2026-10-05T09:01:46.123Z"))
        assertEquals(1791190906000, isoAMillis("2026-10-05T09:01:46Z"))
        assertNull(isoAMillis("ayer"))
        assertNull(isoAMillis(null))
    }
}
