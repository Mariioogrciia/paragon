package com.paragon.app.ui.theme

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color

/**
 * `true` mientras el modo activo sea oscuro — la pone `ParagonTheme` en
 * cuanto sabe el modo real (guardado en `ThemeStore`, o el del sistema si
 * está en automático). Los `val` de abajo son propiedades computadas que
 * leen esto: cualquier Composable que use `Background`, `Foreground`, etc.
 * (los ~20 archivos de pantallas que ya hacían `import ...theme.*`) se
 * recompone solo con el cambio, sin tener que tocar ni una pantalla más.
 */
import com.paragon.app.data.theme.PlatformColor
import androidx.compose.material3.ColorScheme

internal var isDarkTheme by mutableStateOf(true)
internal var activePlatformColor by mutableStateOf(PlatformColor.PARAGON)
internal var activeCustomAccentColor by mutableStateOf<Long?>(null)
// Se guarda el `ColorScheme` dinámico completo (no solo el `primary` de
// antes) para que Material You también pueda mandar en fondo/superficie,
// no solo en el acento — ver `Background`/`Surface`/`Accent` más abajo.
internal var activeDynamicScheme by mutableStateOf<ColorScheme?>(null)

// --- Oscuro (el de siempre) ---
// Fondo/superficie/borde YA dependen de la plataforma elegida (antes solo
// dependía de esto el acento) — cada plataforma es ahora un tema completo,
// no solo un color de botón encima del mismo fondo negro de siempre.
private val DarkBackgroundParagon = Color(0xFF000000)
private val DarkSurfaceParagon = Color(0xFF0C0C0C)
private val DarkSurface2Paragon = Color(0xFF161616)
private val DarkBorderParagon = Color(0xFF262626)

private val DarkBackgroundPS = Color(0xFF00060F)
private val DarkSurfacePS = Color(0xFF060C16)
private val DarkSurface2PS = Color(0xFF0E1830)
private val DarkBorderPS = Color(0xFF1B2A45)

private val DarkBackgroundXbox = Color(0xFF040D04)
private val DarkSurfaceXbox = Color(0xFF0A140A)
private val DarkSurface2Xbox = Color(0xFF11220F)
private val DarkBorderXbox = Color(0xFF1E331A)

// Gris-azulado real de la UI de Steam (mismo tono que sus paneles), no un
// azul cualquiera.
private val DarkBackgroundSteam = Color(0xFF0E141B)
private val DarkSurfaceSteam = Color(0xFF15202B)
private val DarkSurface2Steam = Color(0xFF1B2838)
private val DarkBorderSteam = Color(0xFF2A3F55)

private val DarkForeground = Color(0xFFFFFFFF)
// Mismo valor que --muted en globals.css (web) — antes 0xFFA0A0A0, algo gris
// para texto que sigue siendo funcional (fechas, metadatos), no decorativo.
private val DarkMuted = Color(0xFFA7B0C0)

// Paragon (Neon Purple)
private val DarkAccentParagon = Color(0xFFB026FF)
private val DarkAccent2Paragon = Color(0xFFE08FFF)
private val DarkAccentSoftParagon = Color(0x23B026FF)

// PlayStation (Blue)
private val DarkAccentPS = Color(0xFF0070D1)
private val DarkAccent2PS = Color(0xFF4B9EF5)
private val DarkAccentSoftPS = Color(0x230070D1)

// Xbox (Green)
private val DarkAccentXbox = Color(0xFF107C10)
private val DarkAccent2Xbox = Color(0xFF38B238)
private val DarkAccentSoftXbox = Color(0x23107C10)

// Steam (Steam Blue)
private val DarkAccentSteam = Color(0xFF66C0F4)
private val DarkAccent2Steam = Color(0xFF8ED2F7)
private val DarkAccentSoftSteam = Color(0x2366C0F4)

private val DarkBronze = Color(0xFFC07B4A)
private val DarkSilver = Color(0xFFB9C2CC)
private val DarkGold = Color(0xFFE2B53E)
private val DarkPlatinum = Color(0xFF9FD4EC)
private val DarkGood = Color(0xFF4EC98A)
private val DarkDanger = Color(0xFFFF6B6B)

// --- Claro ---
private val LightBackgroundParagon = Color(0xFFF6F7F9)
private val LightSurfaceParagon = Color(0xFFFFFFFF)
private val LightSurface2Paragon = Color(0xFFEBEDF1)
private val LightBorderParagon = Color(0xFFDBDFE6)

private val LightBackgroundPS = Color(0xFFF3F6FC)
private val LightSurfacePS = Color(0xFFFFFFFF)
private val LightSurface2PS = Color(0xFFE7EEFA)
private val LightBorderPS = Color(0xFFD3E0F5)

private val LightBackgroundXbox = Color(0xFFF2F8F1)
private val LightSurfaceXbox = Color(0xFFFFFFFF)
private val LightSurface2Xbox = Color(0xFFE6F2E4)
private val LightBorderXbox = Color(0xFFCFE6CB)

private val LightBackgroundSteam = Color(0xFFEFF3F6)
private val LightSurfaceSteam = Color(0xFFFFFFFF)
private val LightSurface2Steam = Color(0xFFE3E9EE)
private val LightBorderSteam = Color(0xFFC9D4DC)

private val LightForeground = Color(0xFF12151B)
private val LightMuted = Color(0xFF5B6472)

// Paragon (Neon Purple)
private val LightAccentParagon = Color(0xFF1D6FE0)
private val LightAccent2Paragon = Color(0xFF1B6E93)
private val LightAccentSoftParagon = Color(0x1A1D6FE0)

// PlayStation (Blue)
private val LightAccentPS = Color(0xFF00439C)
private val LightAccent2PS = Color(0xFF005AB5)
private val LightAccentSoftPS = Color(0x1A00439C)

// Xbox (Green)
private val LightAccentXbox = Color(0xFF0B5A0B)
private val LightAccent2Xbox = Color(0xFF107C10)
private val LightAccentSoftXbox = Color(0x1A0B5A0B)

// Steam (Navy Blue)
private val LightAccentSteam = Color(0xFF1B2838)
private val LightAccent2Steam = Color(0xFF2A475E)
private val LightAccentSoftSteam = Color(0x1A1B2838)

private val LightBronze = Color(0xFFA8623A)
private val LightSilver = Color(0xFF6B7480)
private val LightGold = Color(0xFFAD8114)
private val LightPlatinum = Color(0xFF2E6E86)
private val LightGood = Color(0xFF1F9D55)
private val LightDanger = Color(0xFFDC3B3B)

// Material You (fondo real del móvil) manda por encima de la plataforma
// elegida — las dos son paletas completas y no pueden mandar a la vez, así
// que aquí SÍ hay jerarquía real (el selector de Plataforma se bloquea en
// Ajustes mientras esto esté activo, ver `PlatformPicker`).
private fun platformBackground(): Color = when (activePlatformColor) {
    PlatformColor.PARAGON -> if (isDarkTheme) DarkBackgroundParagon else LightBackgroundParagon
    PlatformColor.PLAYSTATION -> if (isDarkTheme) DarkBackgroundPS else LightBackgroundPS
    PlatformColor.XBOX -> if (isDarkTheme) DarkBackgroundXbox else LightBackgroundXbox
    PlatformColor.STEAM -> if (isDarkTheme) DarkBackgroundSteam else LightBackgroundSteam
}

private fun platformSurface(): Color = when (activePlatformColor) {
    PlatformColor.PARAGON -> if (isDarkTheme) DarkSurfaceParagon else LightSurfaceParagon
    PlatformColor.PLAYSTATION -> if (isDarkTheme) DarkSurfacePS else LightSurfacePS
    PlatformColor.XBOX -> if (isDarkTheme) DarkSurfaceXbox else LightSurfaceXbox
    PlatformColor.STEAM -> if (isDarkTheme) DarkSurfaceSteam else LightSurfaceSteam
}

private fun platformSurface2(): Color = when (activePlatformColor) {
    PlatformColor.PARAGON -> if (isDarkTheme) DarkSurface2Paragon else LightSurface2Paragon
    PlatformColor.PLAYSTATION -> if (isDarkTheme) DarkSurface2PS else LightSurface2PS
    PlatformColor.XBOX -> if (isDarkTheme) DarkSurface2Xbox else LightSurface2Xbox
    PlatformColor.STEAM -> if (isDarkTheme) DarkSurface2Steam else LightSurface2Steam
}

private fun platformBorder(): Color = when (activePlatformColor) {
    PlatformColor.PARAGON -> if (isDarkTheme) DarkBorderParagon else LightBorderParagon
    PlatformColor.PLAYSTATION -> if (isDarkTheme) DarkBorderPS else LightBorderPS
    PlatformColor.XBOX -> if (isDarkTheme) DarkBorderXbox else LightBorderXbox
    PlatformColor.STEAM -> if (isDarkTheme) DarkBorderSteam else LightBorderSteam
}

val Background: Color get() = activeDynamicScheme?.background ?: platformBackground()
val Surface: Color get() = activeDynamicScheme?.surface ?: platformSurface()
val Surface2: Color get() = activeDynamicScheme?.surfaceVariant ?: platformSurface2()
val Border: Color get() = activeDynamicScheme?.outline ?: platformBorder()
val Foreground: Color get() = if (isDarkTheme) DarkForeground else LightForeground
val Muted: Color get() = if (isDarkTheme) DarkMuted else LightMuted

// El acento personalizado es una capa aparte (solo el botón/acento, nunca
// el fondo) — por eso siempre puede mandar aquí sin bloquear nada: no
// compite con Material You ni con la Plataforma, que son los que deciden
// el fondo real más arriba.
val Accent: Color get() = when {
    activeCustomAccentColor != null && activeCustomAccentColor != -1L -> Color(activeCustomAccentColor!!)
    activeDynamicScheme != null -> activeDynamicScheme!!.primary
    activePlatformColor == PlatformColor.PARAGON -> if (isDarkTheme) DarkAccentParagon else LightAccentParagon
    activePlatformColor == PlatformColor.PLAYSTATION -> if (isDarkTheme) DarkAccentPS else LightAccentPS
    activePlatformColor == PlatformColor.XBOX -> if (isDarkTheme) DarkAccentXbox else LightAccentXbox
    activePlatformColor == PlatformColor.STEAM -> if (isDarkTheme) DarkAccentSteam else LightAccentSteam
    else -> if (isDarkTheme) DarkAccentParagon else LightAccentParagon
}

val Accent2: Color get() = when {
    activeCustomAccentColor != null && activeCustomAccentColor != -1L -> Color(activeCustomAccentColor!!).copy(alpha = 0.8f)
    activeDynamicScheme != null -> activeDynamicScheme!!.primary.copy(alpha = 0.8f)
    activePlatformColor == PlatformColor.PARAGON -> if (isDarkTheme) DarkAccent2Paragon else LightAccent2Paragon
    activePlatformColor == PlatformColor.PLAYSTATION -> if (isDarkTheme) DarkAccent2PS else LightAccent2PS
    activePlatformColor == PlatformColor.XBOX -> if (isDarkTheme) DarkAccent2Xbox else LightAccent2Xbox
    activePlatformColor == PlatformColor.STEAM -> if (isDarkTheme) DarkAccent2Steam else LightAccent2Steam
    else -> if (isDarkTheme) DarkAccent2Paragon else LightAccent2Paragon
}

val AccentSoft: Color get() = when {
    activeCustomAccentColor != null && activeCustomAccentColor != -1L -> Color(activeCustomAccentColor!!).copy(alpha = 0.15f)
    activeDynamicScheme != null -> activeDynamicScheme!!.primary.copy(alpha = 0.15f)
    activePlatformColor == PlatformColor.PARAGON -> if (isDarkTheme) DarkAccentSoftParagon else LightAccentSoftParagon
    activePlatformColor == PlatformColor.PLAYSTATION -> if (isDarkTheme) DarkAccentSoftPS else LightAccentSoftPS
    activePlatformColor == PlatformColor.XBOX -> if (isDarkTheme) DarkAccentSoftXbox else LightAccentSoftXbox
    activePlatformColor == PlatformColor.STEAM -> if (isDarkTheme) DarkAccentSoftSteam else LightAccentSoftSteam
    else -> if (isDarkTheme) DarkAccentSoftParagon else LightAccentSoftParagon
}

// Trophy Grades
val Bronze: Color get() = if (isDarkTheme) DarkBronze else LightBronze
val Silver: Color get() = if (isDarkTheme) DarkSilver else LightSilver
val Gold: Color get() = if (isDarkTheme) DarkGold else LightGold
val Platinum: Color get() = if (isDarkTheme) DarkPlatinum else LightPlatinum

// Utility
val Good: Color get() = if (isDarkTheme) DarkGood else LightGood
val Danger: Color get() = if (isDarkTheme) DarkDanger else LightDanger
