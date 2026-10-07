package com.paragon.app.ui.theme

import androidx.compose.ui.graphics.Color
import com.paragon.shared.i18n.Texto
import com.paragon.shared.i18n.T

/**
 * Catálogo de apariencia — el MISMO que la web (src/lib/apariencia.ts y
 * src/app/globals.css), con las mismas claves (`accent-blue`,
 * `estilo-ps5`...), porque se guarda en la cuenta y se comparte con la web
 * (/api/mobile/appearance). Si se añade un acento o un estilo en la web,
 * añadirlo aquí con la misma clave y los mismos colores.
 */

/** Suelo de una paleta completa: solo se usa en modo oscuro (como `.dark.accent-*` en la web). */
data class Suelo(val background: Color, val surface: Color, val surface2: Color, val border: Color, val muted: Color? = null)

data class AcentoDef(
    /** Clave de la web; "" = Platino, el de la marca. */
    val clave: String,
    val nombre: Texto,
    /** Acento sobre fondo oscuro. */
    val oscuro: Color,
    /** Acento en modo claro (más saturado: los pasteles se lavan sobre blanco). */
    val claro: Color,
    /** Extremo claro del degradado de marca (`--accent-2`). */
    val acento2: Color,
    val suelo: Suelo? = null,
)

val ACENTOS = listOf(
    AcentoDef("", T.acento_platino, Color(0xFF7CC4E4), Color(0xFF166E96), Color(0xFFD7EEF8)),
    AcentoDef("accent-blue", T.acento_azul, Color(0xFF4A9EFF), Color(0xFF2563EB), Color(0xFF9FD4EC)),
    AcentoDef("accent-violet", T.acento_morado, Color(0xFF8B5CF6), Color(0xFF7C3AED), Color(0xFFC4B5FD)),
    AcentoDef("accent-red", T.acento_rojo, Color(0xFFEF4444), Color(0xFFDC2626), Color(0xFFFCA5A5)),
    AcentoDef("accent-green", T.acento_verde, Color(0xFF10B981), Color(0xFF059669), Color(0xFF6EE7B7)),
    AcentoDef("accent-orange", T.acento_naranja, Color(0xFFF59E0B), Color(0xFFD97706), Color(0xFFFCD34D)),
    AcentoDef("accent-laton", T.acento_laton, Color(0xFFC9A24A), Color(0xFF926E1E), Color(0xFFF0DC9C),
        Suelo(Color(0xFF0B1120), Color(0xFF121B2E), Color(0xFF1B2740), Color(0xFF26334D))),
    AcentoDef("accent-carreras", T.acento_carreras, Color(0xFFFF6A00), Color(0xFFD65000), Color(0xFFE8FF3A),
        Suelo(Color(0xFF121416), Color(0xFF1A1D21), Color(0xFF24282D), Color(0xFF30353C))),
    AcentoDef("accent-salidas", T.acento_salidas, Color(0xFFFFCF3A), Color(0xFFA17600), Color(0xFFFFF1B8),
        Suelo(Color(0xFF0A0C10), Color(0xFF13161C), Color(0xFF1D2129), Color(0xFF2A303A))),
    AcentoDef("accent-datos", T.acento_datos, Color(0xFFF0F4FA), Color(0xFF111111), Color(0xFFFFFFFF),
        Suelo(Color(0xFF000000), Color(0xFF0B0B0B), Color(0xFF171717), Color(0xFF2E2E2E), Color(0xFFB4B4B4))),
    AcentoDef("accent-fosforo", T.acento_fosforo, Color(0xFF33FF66), Color(0xFF0A8C32), Color(0xFFC8FFD6),
        Suelo(Color(0xFF020A04), Color(0xFF07140A), Color(0xFF0E2013), Color(0xFF173420))),
    AcentoDef("accent-inmersion", T.acento_inmersion, Color(0xFF3FD0E0), Color(0xFF088096), Color(0xFFC9F3F8),
        Suelo(Color(0xFF04121F), Color(0xFF0A1C2E), Color(0xFF11283F), Color(0xFF1B3753))),
)

fun acentoPorClave(clave: String): AcentoDef = ACENTOS.firstOrNull { it.clave == clave } ?: ACENTOS[0]

data class EstiloDef(
    val clave: String,
    val nombre: Texto,
    val descripcion: Texto,
    /** Radio fijo de todas las esquinas (como `[class*="rounded"]` en la web); null = el de cada pieza. */
    val radio: Int?,
    /** Fondo propio en modo oscuro (el degradado de la web, su color de arriba); null = el de la app. */
    val fondoOscuro: Color? = null,
    val monoespaciada: Boolean = false,
    /** Fondo propio en modo claro. */
    val fondoClaro: Color? = null,
    /** Color que tiñe tarjetas y bordes del estilo (también en OLED, donde el fondo sigue negro). */
    val tinte: Color? = null,
)

val ESTILOS = listOf(
    EstiloDef("", T.estilo_clasico, T.estilo_clasico_desc, null),
    // Cada estilo trae su propio fondo y tiñe tarjetas y bordes (7 oct 2026:
    // "cambiar el estilo sigue sin cambiar el fondo"): antes solo los de
    // plataforma y solo en modo oscuro.
    EstiloDef("estilo-terminal", T.estilo_terminal, T.estilo_terminal_desc, 2, Color(0xFF03100A), monoespaciada = true, fondoClaro = Color(0xFFEEF5EF), tinte = Color(0xFF33FF66)),
    EstiloDef("estilo-vidrio", T.estilo_vidrio, T.estilo_vidrio_desc, 22, Color(0xFF0B1024), fondoClaro = Color(0xFFECEFFB), tinte = Color(0xFF8EA2FF)),
    EstiloDef("estilo-brutalista", T.estilo_brutalista, T.estilo_brutalista_desc, 0, Color(0xFF141414), fondoClaro = Color(0xFFF7F4EC)),
    EstiloDef("estilo-ps5", T.estilo_ps5, T.estilo_ps5_desc, 20, Color(0xFF050B1A), fondoClaro = Color(0xFFECF2FC), tinte = Color(0xFF4A9EFF)),
    EstiloDef("estilo-xbox", T.estilo_xbox, T.estilo_xbox_desc, 8, Color(0xFF060D08), fondoClaro = Color(0xFFEDF6EE), tinte = Color(0xFF3DDC64)),
    EstiloDef("estilo-steam", T.estilo_steam, T.estilo_steam_desc, 6, Color(0xFF0E1621), fondoClaro = Color(0xFFECF1F6), tinte = Color(0xFF66C0F4)),
    EstiloDef("estilo-switch", T.estilo_switch, T.estilo_switch_desc, 14, Color(0xFF131313), fondoClaro = Color(0xFFF4F4F4), tinte = Color(0xFFE60012)),
)

fun estiloPorClave(clave: String): EstiloDef = ESTILOS.firstOrNull { it.clave == clave } ?: ESTILOS[0]

/** Tamaño de letra de toda la interfaz (mismas claves y escalas que la web). */
data class TamanoTextoDef(val clave: String, val nombre: Texto, val escala: Float)

val TAMANOS_TEXTO = listOf(
    TamanoTextoDef("pequeno", T.texto_pequeno, 0.875f),
    TamanoTextoDef("", T.texto_normal, 1f),
    TamanoTextoDef("grande", T.texto_grande, 1.125f),
    TamanoTextoDef("enorme", T.texto_enorme, 1.25f),
)

fun tamanoPorClave(clave: String): TamanoTextoDef = TAMANOS_TEXTO.firstOrNull { it.clave == clave } ?: TAMANOS_TEXTO[1]

/** Paleta "desde tu juego", ya calculada por el servidor (lib/paletaJuego.ts). */
data class PaletaJuego(
    val id: String,
    val color: String,
    val oscuro: Color,
    val claro: Color,
    val acento2: Color,
    val suelo: Suelo,
)
