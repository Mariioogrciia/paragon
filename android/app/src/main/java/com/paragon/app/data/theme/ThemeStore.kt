package com.paragon.app.data.theme

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import com.paragon.app.ui.theme.PaletaJuego
import com.paragon.app.ui.theme.Suelo
import com.paragon.app.util.applyLauncherIcon
import com.paragon.app.util.flushPendingDisable

/** Modo de color. SISTEMA sigue al teléfono (oscuro/claro); el resto, como en la web. */
enum class ThemeMode { SISTEMA, OSCURO, CLARO, OLED, CONTRASTE }

/**
 * Preferencias de apariencia y de uso, en SharedPreferences y expuestas como
 * estado de Compose (cambiarlas recompone `ParagonTheme` al momento).
 *
 * Apariencia = la misma que la web (4 oct 2026): acento (`accent-*`), color
 * libre, paleta de juego, estilo (`estilo-*`) y tamaño de texto se guardan
 * también en la cuenta (AparienciaRepository ↔ /api/mobile/appearance); el
 * modo y Material You son solo de este teléfono, como en la web el modo es
 * de cada navegador.
 */
class ThemeStore(context: Context) {
    private val appContext = context.applicationContext
    private val prefs: SharedPreferences =
        context.getSharedPreferences("paragon_theme", Context.MODE_PRIVATE)

    // Nombres distintos de los setters públicos a propósito (un `var` con
    // `private set` llamado `mode` chocaría con `setMode()` en la JVM).
    private var current: ThemeMode by mutableStateOf(loadMode())
    private var currentAcento by mutableStateOf(prefs.getString(KEY_ACENTO, "") ?: "")
    private var currentAcentoLibre by mutableStateOf(prefs.getString(KEY_ACENTO_LIBRE, "") ?: "")
    private var currentPaletaJuego by mutableStateOf(loadPaletaJuego())
    private var currentEstilo by mutableStateOf(prefs.getString(KEY_ESTILO, "") ?: "")
    private var currentTamanoTexto by mutableStateOf(prefs.getString(KEY_TAMANO_TEXTO, "") ?: "")
    private var currentUseDynamicColor by mutableStateOf(prefs.getBoolean(KEY_USE_DYNAMIC_COLOR, false))
    private var currentNivel by mutableIntStateOf(prefs.getInt(KEY_NIVEL, 1))
    private var currentRequisitos by mutableStateOf(loadRequisitos())

    // Configuración de Solo Player
    private var isZenModeEnabled by mutableStateOf(prefs.getBoolean(KEY_ZEN_MODE, false))
    private var currentRivalHandle by mutableStateOf(prefs.getString(KEY_RIVAL_HANDLE, null))
    private var currentTargetPlatinums by mutableStateOf(
        if (prefs.contains(KEY_TARGET_PLATINUMS)) prefs.getInt(KEY_TARGET_PLATINUMS, 0) else null
    )
    private var currentLibraryLayout by mutableStateOf(prefs.getInt(KEY_LIBRARY_LAYOUT, 0))

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
        // Icono único (la P): por si estaba activo el de PlayStation/Xbox/Steam
        // de antes. Sin coste si ya está bien. Ver IconSwitcher.kt.
        applyLauncherIcon(appContext)
        flushPendingDisable(appContext)
    }

    /**
     * Hasta el 4 oct 2026 la app tenía tema de plataforma, color de acento
     * de una paleta propia y tipo de letra. Lo único que tiene equivalente
     * en el modelo nuevo es el color propio, que pasa a ser el color libre.
     */
    private fun migrarAntiguo() {
        if (!prefs.contains(KEY_OLD_PLATFORM) && !prefs.contains(KEY_OLD_CUSTOM_ACCENT) && !prefs.contains(KEY_OLD_FONT)) return
        val antiguo = if (prefs.contains(KEY_OLD_CUSTOM_ACCENT)) prefs.getLong(KEY_OLD_CUSTOM_ACCENT, -1L) else -1L
        val editor = prefs.edit().remove(KEY_OLD_PLATFORM).remove(KEY_OLD_CUSTOM_ACCENT).remove(KEY_OLD_FONT)
        if (antiguo != -1L && currentAcentoLibre.isEmpty()) {
            val hex = "#%06x".format(Color(antiguo).toArgb() and 0xFFFFFF)
            currentAcentoLibre = hex
            editor.putString(KEY_ACENTO_LIBRE, hex)
        }
        editor.apply()
    }

    private fun loadMode(): ThemeMode =
        prefs.getString(KEY_MODE, null)?.let { saved -> ThemeMode.entries.find { it.name == saved } } ?: ThemeMode.SISTEMA

    fun setMode(value: ThemeMode) {
        current = value
        prefs.edit().putString(KEY_MODE, value.name).apply()
    }

    /** Elegir un acento de la lista quita el color libre y la paleta de juego (igual que la web). */
    fun setAcento(clave: String) {
        currentAcento = clave
        currentAcentoLibre = ""
        currentPaletaJuego = null
        prefs.edit().putString(KEY_ACENTO, clave).remove(KEY_ACENTO_LIBRE).remove(KEY_PALETA_JUEGO).apply()
    }

    fun setAcentoLibre(hex: String) {
        currentAcentoLibre = hex
        currentPaletaJuego = null
        prefs.edit().putString(KEY_ACENTO_LIBRE, hex).remove(KEY_PALETA_JUEGO).apply()
    }

    fun setEstilo(clave: String) {
        currentEstilo = clave
        prefs.edit().putString(KEY_ESTILO, clave).apply()
    }

    fun setTamanoTexto(clave: String) {
        currentTamanoTexto = clave
        prefs.edit().putString(KEY_TAMANO_TEXTO, clave).apply()
    }

    fun setUseDynamicColor(value: Boolean) {
        currentUseDynamicColor = value
        prefs.edit().putBoolean(KEY_USE_DYNAMIC_COLOR, value).apply()
    }

    /** Lo guardado en la cuenta manda sobre este teléfono (como en la web al abrir cualquier página). */
    fun aplicarDeCuenta(
        acento: String,
        acentoLibre: String,
        paletaJuego: PaletaJuego?,
        estilo: String,
        tamanoTexto: String,
        nivel: Int,
        requisitos: Map<String, Int>,
    ) {
        currentAcento = acento
        currentAcentoLibre = acentoLibre
        currentPaletaJuego = paletaJuego
        // Un estilo por encima del nivel se quita (p. ej. elegido antes de existir el requisito).
        currentEstilo = if ((requisitos[estilo] ?: 0) > nivel) "" else estilo
        currentTamanoTexto = tamanoTexto
        currentNivel = nivel
        currentRequisitos = requisitos
        prefs.edit()
            .putString(KEY_ACENTO, acento)
            .putString(KEY_ACENTO_LIBRE, acentoLibre)
            .putString(KEY_ESTILO, currentEstilo)
            .putString(KEY_TAMANO_TEXTO, tamanoTexto)
            .putInt(KEY_NIVEL, nivel)
            .putString(KEY_REQUISITOS, requisitos.entries.joinToString(";") { "${it.key}=${it.value}" })
            .apply {
                if (paletaJuego == null) remove(KEY_PALETA_JUEGO) else putString(KEY_PALETA_JUEGO, guardarPaleta(paletaJuego))
            }
            .apply()
    }

    fun quitarPaletaJuego() {
        currentPaletaJuego = null
        prefs.edit().remove(KEY_PALETA_JUEGO).apply()
    }

    private fun loadRequisitos(): Map<String, Int> =
        (prefs.getString(KEY_REQUISITOS, null) ?: "estilo-ps5=10;estilo-xbox=10;estilo-steam=20;estilo-switch=20")
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
        val partes = prefs.getString(KEY_PALETA_JUEGO, null)?.split("|") ?: return null
        if (partes.size != 9) return null
        val c = partes.drop(2).map { it.toIntOrNull() ?: return null }.map { Color(it) }
        return PaletaJuego(partes[0], partes[1], c[0], c[1], c[2], Suelo(c[3], c[4], c[5], c[6]))
    }

    fun setZenMode(value: Boolean) {
        isZenModeEnabled = value
        prefs.edit().putBoolean(KEY_ZEN_MODE, value).apply()
    }

    fun setRivalHandle(value: String?) {
        currentRivalHandle = value
        if (value == null) prefs.edit().remove(KEY_RIVAL_HANDLE).apply()
        else prefs.edit().putString(KEY_RIVAL_HANDLE, value).apply()
    }

    fun setTargetPlatinums(value: Int?) {
        currentTargetPlatinums = value
        if (value == null) prefs.edit().remove(KEY_TARGET_PLATINUMS).apply()
        else prefs.edit().putInt(KEY_TARGET_PLATINUMS, value).apply()
    }

    fun setLibraryLayout(value: Int) {
        currentLibraryLayout = value
        prefs.edit().putInt(KEY_LIBRARY_LAYOUT, value).apply()
    }

    companion object {
        private const val KEY_MODE = "mode"
        private const val KEY_ACENTO = "acento"
        private const val KEY_ACENTO_LIBRE = "acento_libre"
        private const val KEY_PALETA_JUEGO = "paleta_juego"
        private const val KEY_ESTILO = "estilo"
        private const val KEY_TAMANO_TEXTO = "tamano_texto"
        private const val KEY_NIVEL = "nivel_paragon"
        private const val KEY_REQUISITOS = "requisitos_estilo"
        private const val KEY_ZEN_MODE = "zen_mode"
        private const val KEY_RIVAL_HANDLE = "rival_handle"
        private const val KEY_TARGET_PLATINUMS = "target_platinums"
        private const val KEY_USE_DYNAMIC_COLOR = "use_dynamic_color"
        private const val KEY_LIBRARY_LAYOUT = "library_layout"
        // Del modelo anterior (hasta el 4 oct 2026), solo para migrar.
        private const val KEY_OLD_PLATFORM = "platform"
        private const val KEY_OLD_CUSTOM_ACCENT = "custom_accent_color"
        private const val KEY_OLD_FONT = "font_family"
    }
}
