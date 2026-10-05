package com.paragon.app.data.theme

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import com.paragon.app.ui.theme.PaletaJuego
import com.paragon.app.ui.theme.Suelo
import com.paragon.app.ui.theme.colorDeHex
import com.paragon.shared.red.AcentoJuegoDto
import com.paragon.shared.red.AparienciaDto
import com.paragon.shared.red.GuardarAparienciaRequest
import com.paragon.shared.red.PaletaJuegoDto
import com.russhwolf.settings.Settings

/** Modo de color. SISTEMA sigue al teléfono (oscuro/claro); el resto, como en la web. */
enum class ThemeMode { SISTEMA, OSCURO, CLARO, OLED, CONTRASTE }

/**
 * Preferencias de apariencia y de uso, guardadas en el teléfono y expuestas
 * como estado de Compose (cambiarlas recompone `ParagonTheme` al momento).
 * El almacén lo pone cada plataforma: SharedPreferences "paragon_theme" en
 * Android (las mismas claves de siempre), NSUserDefaults en iOS.
 *
 * Apariencia = la misma que la web (4 oct 2026): acento (`accent-*`), color
 * libre, paleta de juego, estilo (`estilo-*`) y tamaño de texto se guardan
 * también en la cuenta (AparienciaRepository ↔ /api/mobile/appearance); el
 * modo y Material You son solo de este teléfono, como en la web el modo es
 * de cada navegador.
 */
class ThemeStore(private val prefs: Settings) : ThemeSettings {
    // Nombres distintos de los setters públicos a propósito (un `var` con
    // `private set` llamado `mode` chocaría con `setMode()` en la JVM).
    private var current: ThemeMode by mutableStateOf(loadMode())
    private var currentAcento by mutableStateOf(prefs.getString(KEY_ACENTO, ""))
    private var currentAcentoLibre by mutableStateOf(prefs.getString(KEY_ACENTO_LIBRE, ""))
    private var currentPaletaJuego by mutableStateOf(loadPaletaJuego())
    private var currentEstilo by mutableStateOf(prefs.getString(KEY_ESTILO, ""))
    private var currentTamanoTexto by mutableStateOf(prefs.getString(KEY_TAMANO_TEXTO, ""))
    private var currentUseDynamicColor by mutableStateOf(prefs.getBoolean(KEY_USE_DYNAMIC_COLOR, false))
    private var currentNivel by mutableIntStateOf(prefs.getInt(KEY_NIVEL, 1))
    private var currentRequisitos by mutableStateOf(loadRequisitos())

    // Configuración de Solo Player
    private var isZenModeEnabled by mutableStateOf(prefs.getBoolean(KEY_ZEN_MODE, false))
    private var currentRivalHandle by mutableStateOf(prefs.getStringOrNull(KEY_RIVAL_HANDLE))
    private var currentTargetPlatinums by mutableStateOf(prefs.getIntOrNull(KEY_TARGET_PLATINUMS))
    private var currentLibraryLayout by mutableIntStateOf(prefs.getInt(KEY_LIBRARY_LAYOUT, 0))

    val mode: ThemeMode get() = current
    val acento: String get() = currentAcento
    val acentoLibre: String get() = currentAcentoLibre
    val paletaJuego: PaletaJuego? get() = currentPaletaJuego
    val estilo: String get() = currentEstilo
    val tamanoTexto: String get() = currentTamanoTexto
    val useDynamicColor: Boolean get() = currentUseDynamicColor
    /** Nivel Paragon y nivel mínimo de cada estilo, tal como los dio el servidor la última vez. */
    val nivel: Int get() = currentNivel
    val requisitosEstilo: Map<String, Int> get() = currentRequisitos
    val zenMode: Boolean get() = isZenModeEnabled
    val rivalHandle: String? get() = currentRivalHandle
    val targetPlatinums: Int? get() = currentTargetPlatinums
    val libraryLayout: Int get() = currentLibraryLayout

    init {
        migrarAntiguo()
    }

    /**
     * Hasta el 4 oct 2026 la app Android tenía tema de plataforma, color de
     * acento de una paleta propia y tipo de letra. Lo único que tiene
     * equivalente en el modelo nuevo es el color propio, que pasa a ser el
     * color libre.
     */
    private fun migrarAntiguo() {
        if (!prefs.hasKey(KEY_OLD_PLATFORM) && !prefs.hasKey(KEY_OLD_CUSTOM_ACCENT) && !prefs.hasKey(KEY_OLD_FONT)) return
        val antiguo = prefs.getLongOrNull(KEY_OLD_CUSTOM_ACCENT)
        prefs.remove(KEY_OLD_PLATFORM)
        prefs.remove(KEY_OLD_CUSTOM_ACCENT)
        prefs.remove(KEY_OLD_FONT)
        if (antiguo != null && antiguo != -1L && currentAcentoLibre.isEmpty()) {
            val hex = "#" + (Color(antiguo).toArgb() and 0xFFFFFF).toString(16).padStart(6, '0')
            currentAcentoLibre = hex
            prefs.putString(KEY_ACENTO_LIBRE, hex)
        }
    }

    private fun loadMode(): ThemeMode =
        prefs.getStringOrNull(KEY_MODE)?.let { saved -> ThemeMode.entries.find { it.name == saved } } ?: ThemeMode.SISTEMA

    fun setMode(value: ThemeMode) {
        current = value
        prefs.putString(KEY_MODE, value.name)
    }

    /** Elegir un acento de la lista quita el color libre y la paleta de juego (igual que la web). */
    fun setAcento(clave: String) {
        currentAcento = clave
        currentAcentoLibre = ""
        currentPaletaJuego = null
        prefs.putString(KEY_ACENTO, clave)
        prefs.remove(KEY_ACENTO_LIBRE)
        prefs.remove(KEY_PALETA_JUEGO)
    }

    fun setAcentoLibre(hex: String) {
        currentAcentoLibre = hex
        currentPaletaJuego = null
        prefs.putString(KEY_ACENTO_LIBRE, hex)
        prefs.remove(KEY_PALETA_JUEGO)
    }

    fun setEstilo(clave: String) {
        currentEstilo = clave
        prefs.putString(KEY_ESTILO, clave)
    }

    fun setTamanoTexto(clave: String) {
        currentTamanoTexto = clave
        prefs.putString(KEY_TAMANO_TEXTO, clave)
    }

    fun setUseDynamicColor(value: Boolean) {
        currentUseDynamicColor = value
        prefs.putBoolean(KEY_USE_DYNAMIC_COLOR, value)
    }

    override fun aplicarDeCuenta(dto: AparienciaDto) {
        val paletaJuego = dto.acentoJuego?.let { j -> j.paleta?.let { paletaDesdeDto(j.id, j.color, it) } }
        val requisitos = dto.requisitosEstilo

        currentAcento = dto.acento
        currentAcentoLibre = dto.acentoLibre
        currentPaletaJuego = paletaJuego
        // Un estilo por encima del nivel se quita (p. ej. elegido antes de existir el requisito).
        currentEstilo = if ((requisitos[dto.estilo] ?: 0) > dto.nivel) "" else dto.estilo
        currentTamanoTexto = dto.tamanoTexto
        currentNivel = dto.nivel
        currentRequisitos = requisitos
        prefs.putString(KEY_ACENTO, dto.acento)
        prefs.putString(KEY_ACENTO_LIBRE, dto.acentoLibre)
        prefs.putString(KEY_ESTILO, currentEstilo)
        prefs.putString(KEY_TAMANO_TEXTO, dto.tamanoTexto)
        prefs.putInt(KEY_NIVEL, dto.nivel)
        prefs.putString(KEY_REQUISITOS, requisitos.entries.joinToString(";") { "${it.key}=${it.value}" })
        if (paletaJuego == null) prefs.remove(KEY_PALETA_JUEGO) else prefs.putString(KEY_PALETA_JUEGO, guardarPaleta(paletaJuego))
    }

    override fun requestParaGuardar(): GuardarAparienciaRequest {
        val juego = currentPaletaJuego?.let { AcentoJuegoDto(it.id, it.color) }
        return GuardarAparienciaRequest(currentAcento, currentAcentoLibre, juego, currentEstilo, currentTamanoTexto)
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

    fun quitarPaletaJuego() {
        currentPaletaJuego = null
        prefs.remove(KEY_PALETA_JUEGO)
    }

    private fun loadRequisitos(): Map<String, Int> =
        (prefs.getStringOrNull(KEY_REQUISITOS) ?: "estilo-ps5=10;estilo-xbox=10;estilo-steam=20;estilo-switch=20")
            .split(";").mapNotNull { par ->
                val (k, v) = par.split("=").takeIf { it.size == 2 } ?: return@mapNotNull null
                v.toIntOrNull()?.let { k to it }
            }.toMap()

    // Paleta de juego: id|color|oscuro|claro|acento2|bg|surface|surface2|border (colores en ARGB)
    private fun guardarPaleta(p: PaletaJuego): String = listOf(
        p.id, p.color, p.oscuro.toArgb(), p.claro.toArgb(), p.acento2.toArgb(),
        p.suelo.background.toArgb(), p.suelo.surface.toArgb(), p.suelo.surface2.toArgb(), p.suelo.border.toArgb(),
    ).joinToString("|")

    private fun loadPaletaJuego(): PaletaJuego? {
        val partes = prefs.getStringOrNull(KEY_PALETA_JUEGO)?.split("|") ?: return null
        if (partes.size != 9) return null
        val c = partes.drop(2).map { it.toIntOrNull() ?: return null }.map { Color(it) }
        return PaletaJuego(partes[0], partes[1], c[0], c[1], c[2], Suelo(c[3], c[4], c[5], c[6]))
    }

    fun setZenMode(value: Boolean) {
        isZenModeEnabled = value
        prefs.putBoolean(KEY_ZEN_MODE, value)
    }

    fun setRivalHandle(value: String?) {
        currentRivalHandle = value
        if (value == null) prefs.remove(KEY_RIVAL_HANDLE) else prefs.putString(KEY_RIVAL_HANDLE, value)
    }

    fun setTargetPlatinums(value: Int?) {
        currentTargetPlatinums = value
        if (value == null) prefs.remove(KEY_TARGET_PLATINUMS) else prefs.putInt(KEY_TARGET_PLATINUMS, value)
    }

    fun setLibraryLayout(value: Int) {
        currentLibraryLayout = value
        prefs.putInt(KEY_LIBRARY_LAYOUT, value)
    }

    private companion object {
        const val KEY_MODE = "mode"
        const val KEY_ACENTO = "acento"
        const val KEY_ACENTO_LIBRE = "acento_libre"
        const val KEY_PALETA_JUEGO = "paleta_juego"
        const val KEY_ESTILO = "estilo"
        const val KEY_TAMANO_TEXTO = "tamano_texto"
        const val KEY_NIVEL = "nivel_paragon"
        const val KEY_REQUISITOS = "requisitos_estilo"
        const val KEY_ZEN_MODE = "zen_mode"
        const val KEY_RIVAL_HANDLE = "rival_handle"
        const val KEY_TARGET_PLATINUMS = "target_platinums"
        const val KEY_USE_DYNAMIC_COLOR = "use_dynamic_color"
        const val KEY_LIBRARY_LAYOUT = "library_layout"
        // Del modelo anterior (hasta el 4 oct 2026), solo para migrar.
        const val KEY_OLD_PLATFORM = "platform"
        const val KEY_OLD_CUSTOM_ACCENT = "custom_accent_color"
        const val KEY_OLD_FONT = "font_family"
    }
}
