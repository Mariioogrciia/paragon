package com.paragon.app.data

import androidx.compose.ui.graphics.Color
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.AcentoJuegoDto
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.AparienciaDto
import com.paragon.app.data.network.GuardarAparienciaRequest
import com.paragon.app.data.network.PaletaJuegoDto
import com.paragon.app.data.theme.ThemeStore
import com.paragon.app.ui.theme.PaletaJuego
import com.paragon.app.ui.theme.Suelo
import com.paragon.app.ui.theme.colorDeHex

/**
 * Apariencia compartida con la web (4 oct 2026): al abrir la app se trae la
 * de la cuenta (manda sobre el teléfono, como en la web al cargar cualquier
 * página) y cada cambio en Ajustes → Apariencia se guarda en la cuenta.
 * Sin red, el cambio se queda en el teléfono y se vuelve a mandar en el
 * siguiente cambio; nunca se bloquea la interfaz por esto.
 */
class AparienciaRepository(private val tokenStore: TokenStore, private val themeStore: ThemeStore) {

    suspend fun sincronizarDesdeCuenta() {
        if (tokenStore.token == null) return
        try {
            val dto = ApiClient.aparienciaApi(tokenStore).obtener()
            // Cuenta sin nada guardado todavía (nunca tocó la apariencia en la
            // web): se sube la del teléfono en vez de pisarla con la de serie.
            if (!dto.guardada) {
                guardar()
                return
            }
            aplicar(dto)
        } catch (e: Exception) {
            // Sin red: se queda la del teléfono.
        }
    }

    /** Manda la apariencia actual del teléfono a la cuenta y aplica lo que el servidor acepte (p. ej. quita un estilo sin nivel). */
    suspend fun guardar() {
        if (tokenStore.token == null) return
        try {
            val juego = themeStore.paletaJuego?.let { AcentoJuegoDto(it.id, it.color) }
            val dto = ApiClient.aparienciaApi(tokenStore).guardar(
                GuardarAparienciaRequest(themeStore.acento, themeStore.acentoLibre, juego, themeStore.estilo, themeStore.tamanoTexto),
            )
            aplicar(dto)
        } catch (e: Exception) {
            // Sin red: se reintenta con el siguiente cambio o al volver a abrir la app.
        }
    }

    private fun aplicar(dto: AparienciaDto) {
        themeStore.aplicarDeCuenta(
            acento = dto.acento,
            acentoLibre = dto.acentoLibre,
            paletaJuego = dto.acentoJuego?.let { j -> j.paleta?.let { paletaDesdeDto(j.id, j.color, it) } },
            estilo = dto.estilo,
            tamanoTexto = dto.tamanoTexto,
            nivel = dto.nivel,
            requisitos = dto.requisitosEstilo,
        )
    }

    private fun paletaDesdeDto(id: String, color: String, p: PaletaJuegoDto): PaletaJuego? {
        fun rgb(canales: String): Color? {
            val v = canales.trim().split(' ').filter { it.isNotEmpty() }.mapNotNull { it.toIntOrNull() }
            return if (v.size == 3) Color(v[0], v[1], v[2]) else null
        }
        return PaletaJuego(
            id = id,
            color = color,
            oscuro = rgb(p.rgb) ?: return null,
            claro = rgb(p.rgbClaro) ?: return null,
            acento2 = colorDeHex(p.c2) ?: return null,
            suelo = Suelo(
                colorDeHex(p.bg) ?: return null,
                colorDeHex(p.surface) ?: return null,
                colorDeHex(p.surface2) ?: return null,
                colorDeHex(p.border) ?: return null,
            ),
        )
    }
}
