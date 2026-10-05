package com.paragon.app.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.luminance
import com.paragon.app.data.theme.ThemeMode

/**
 * Colores de la app = los de la web (4 oct 2026): mismos modos (oscuro,
 * claro, OLED, contraste alto), mismos acentos y paletas completas, mismo
 * color libre y paleta "desde tu juego" (ver Apariencia.kt y
 * src/app/globals.css). Antes la app tenía su propio mundo (morado neón
 * sobre negro, temas de PlayStation/Xbox/Steam) que no se parecía a la web.
 *
 * Los `val` de abajo son propiedades computadas sobre estado de Compose:
 * `ParagonTheme` escribe el estado y cualquier pantalla que use
 * `Background`, `Accent`... se recompone sola al cambiar la apariencia.
 */

/** Modo ya resuelto (SISTEMA convertido en OSCURO o CLARO). */
internal var modoActivo by mutableStateOf(ThemeMode.OSCURO)
internal val isDarkTheme: Boolean get() = modoActivo != ThemeMode.CLARO
internal var acentoActivo by mutableStateOf(ACENTOS[0])
internal var acentoLibreActivo by mutableStateOf<Color?>(null)
internal var paletaJuegoActiva by mutableStateOf<PaletaJuego?>(null)
internal var estiloActivo by mutableStateOf(ESTILOS[0])
// Material You (solo móvil): el esquema dinámico completo, manda sobre todo
// lo demás mientras está activo.
internal var activeDynamicScheme by mutableStateOf<ColorScheme?>(null)

// --- Bases por modo (globals.css: :root, .light, .oled, .high-contrast) ---
private val BaseOscuro = Suelo(Color(0xFF0A0D13), Color(0xFF10151F), Color(0xFF1B2330), Color(0xFF212A38), Color(0xFFA7B0C0))
private val BaseClaro = Suelo(Color(0xFFF4F6FA), Color(0xFFFFFFFF), Color(0xFFEAEDF4), Color(0xFFD8DEE8), Color(0xFF64748B))
private val BaseOled = Suelo(Color(0xFF000000), Color(0xFF0A0A0C), Color(0xFF141418), Color(0xFF232329), Color(0xFFA7B0C0))
private val BaseContraste = Suelo(Color(0xFF000000), Color(0xFF0C1017), Color(0xFF1A212E), Color(0xFF5A6B82), Color(0xFFC3CDDB))

/**
 * El suelo del momento. Las paletas completas (y la de juego) solo cambian
 * el fondo en modo oscuro, igual que la web: en claro, OLED o contraste
 * mandan lo que esos modos existen para hacer. Los estilos de plataforma
 * (PS5, Xbox...) tiñen el fondo en oscuro si la paleta no trae el suyo.
 */
private fun suelo(): Suelo = when (modoActivo) {
    ThemeMode.CLARO -> BaseClaro
    ThemeMode.OLED -> BaseOled
    ThemeMode.CONTRASTE -> BaseContraste
    else -> paletaJuegoActiva?.suelo
        ?: acentoActivo.suelo?.let { if (acentoLibreActivo == null) it else null }
        ?: estiloActivo.fondoOscuro?.let { BaseOscuro.copy(background = it) }
        ?: BaseOscuro
}

private val vidrio: Boolean get() = estiloActivo.clave == "estilo-vidrio"
private val brutalista: Boolean get() = estiloActivo.clave == "estilo-brutalista"

val Background: Color get() = activeDynamicScheme?.background ?: suelo().background
// Vidrio: superficies algo translúcidas sobre el fondo (la web, además, desenfoca).
val Surface: Color get() = activeDynamicScheme?.surface ?: suelo().surface.let { if (vidrio) it.copy(alpha = 0.78f) else it }
val Surface2: Color get() = activeDynamicScheme?.surfaceVariant ?: suelo().surface2.let { if (vidrio) it.copy(alpha = 0.82f) else it }
// Brutalista: bordes marcados con el color del texto, nada de líneas tenues.
val Border: Color get() = if (brutalista) Foreground.copy(alpha = 0.6f) else activeDynamicScheme?.outline ?: suelo().border
val Foreground: Color get() = when (modoActivo) {
    ThemeMode.CLARO -> Color(0xFF10151F)
    ThemeMode.CONTRASTE -> Color(0xFFFFFFFF)
    else -> Color(0xFFE9EEF7)
}
val Muted: Color get() = suelo().muted ?: if (isDarkTheme) Color(0xFFA7B0C0) else Color(0xFF64748B)

/** Prioridad igual que la web: paleta de juego > color libre > acento elegido. Material You por encima de todo. */
val Accent: Color get() = activeDynamicScheme?.primary
    ?: paletaJuegoActiva?.let { if (isDarkTheme) it.oscuro else it.claro }
    ?: acentoLibreActivo
    ?: if (isDarkTheme) acentoActivo.oscuro else acentoActivo.claro

/** Extremo claro del degradado de marca. En claro, el acento mezclado con blanco (como la web). */
val Accent2: Color get() = when {
    activeDynamicScheme != null -> activeDynamicScheme!!.primaryContainer
    !isDarkTheme -> lerp(Accent, Color.White, 0.45f)
    paletaJuegoActiva != null -> paletaJuegoActiva!!.acento2
    acentoLibreActivo != null -> lerp(acentoLibreActivo!!, Color.White, 0.55f)
    else -> acentoActivo.acento2
}

val AccentSoft: Color get() = Accent.copy(alpha = if (modoActivo == ThemeMode.CONTRASTE) 0.22f else 0.14f)

/**
 * Texto/icono encima de un relleno de acento: oscuro si el acento es claro
 * (Platino, Datos, Salidas...), blanco si es oscuro. La web pone texto
 * oscuro sobre sus botones de acento; con blanco fijo, el Platino no se leía.
 */
val OnAccent: Color get() = if (Accent.luminance() > 0.45f) Color(0xFF0A0D13) else Color.White

/** Texto legible encima de cualquier relleno (marca de una plataforma, carátula...). */
fun textoSobre(fondo: Color): Color = if (fondo.luminance() > 0.45f) Color(0xFF0A0D13) else Color.White

// Grados de trofeo
val Bronze: Color get() = if (isDarkTheme) Color(0xFFC07B4A) else Color(0xFFA8623A)
val Silver: Color get() = if (isDarkTheme) Color(0xFFB9C2CC) else Color(0xFF6B7480)
val Gold: Color get() = if (isDarkTheme) Color(0xFFE2B53E) else Color(0xFFAD8114)
val Platinum: Color get() = if (isDarkTheme) Color(0xFF9FD4EC) else Color(0xFF2E6E86)

val Good: Color get() = if (isDarkTheme) Color(0xFF4EC98A) else Color(0xFF10B981)
val Danger: Color get() = if (isDarkTheme) Color(0xFFFF6B6B) else Color(0xFFEF4444)

/**
 * Colores de marca de terceros (auditoría, 4 oct 2026): antes repetidos a
 * mano en Cuentas vinculadas y en el login. No cambian con el tema a
 * propósito — son la identidad de cada plataforma, no del tema de Paragon.
 */
val MarcaPlayStation = Color(0xFF0070D1)
val MarcaXbox = Color(0xFF107C10)
val MarcaSteam = Color(0xFF66C0F4)
val MarcaGoogle = Color(0xFF4285F4)
val MarcaDiscord = Color(0xFF5865F2)
