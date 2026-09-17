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
 * (los ~20 archivos de pantallas que ya hacían `import ...theme.*`) se
 * recompone solo con el cambio, sin tener que tocar ni una pantalla más.
 */
import com.paragon.app.data.theme.PlatformColor

internal var isDarkTheme by mutableStateOf(true)
internal var activePlatformColor by mutableStateOf(PlatformColor.PARAGON)
internal var activeCustomAccentColor by mutableStateOf<Long?>(null)
internal var activeDynamicAccentColor by mutableStateOf<Color?>(null)

// --- Oscuro (el de siempre) ---
private val DarkBackground = Color(0xFF000000)
private val DarkSurface = Color(0xFF0C0C0C)
private val DarkSurface2 = Color(0xFF161616)
private val DarkBorder = Color(0xFF262626)
private val DarkForeground = Color(0xFFFFFFFF)
private val DarkMuted = Color(0xFFA0A0A0)

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
private val LightBackground = Color(0xFFF6F7F9)
private val LightSurface = Color(0xFFFFFFFF)
private val LightSurface2 = Color(0xFFEBEDF1)
private val LightBorder = Color(0xFFDBDFE6)
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

val Background: Color get() = if (isDarkTheme) DarkBackground else LightBackground
val Surface: Color get() = if (isDarkTheme) DarkSurface else LightSurface
val Surface2: Color get() = if (isDarkTheme) DarkSurface2 else LightSurface2
val Border: Color get() = if (isDarkTheme) DarkBorder else LightBorder
val Foreground: Color get() = if (isDarkTheme) DarkForeground else LightForeground
val Muted: Color get() = if (isDarkTheme) DarkMuted else LightMuted

val Accent: Color get() = when {
    activeCustomAccentColor != null && activeCustomAccentColor != -1L -> Color(activeCustomAccentColor!!)
    activeDynamicAccentColor != null -> activeDynamicAccentColor!!
    activePlatformColor == PlatformColor.PARAGON -> if (isDarkTheme) DarkAccentParagon else LightAccentParagon
    activePlatformColor == PlatformColor.PLAYSTATION -> if (isDarkTheme) DarkAccentPS else LightAccentPS
    activePlatformColor == PlatformColor.XBOX -> if (isDarkTheme) DarkAccentXbox else LightAccentXbox
    activePlatformColor == PlatformColor.STEAM -> if (isDarkTheme) DarkAccentSteam else LightAccentSteam
    else -> if (isDarkTheme) DarkAccentParagon else LightAccentParagon
}

val Accent2: Color get() = when {
    activeCustomAccentColor != null && activeCustomAccentColor != -1L -> Color(activeCustomAccentColor!!).copy(alpha = 0.8f)
    activeDynamicAccentColor != null -> activeDynamicAccentColor!!.copy(alpha = 0.8f)
    activePlatformColor == PlatformColor.PARAGON -> if (isDarkTheme) DarkAccent2Paragon else LightAccent2Paragon
    activePlatformColor == PlatformColor.PLAYSTATION -> if (isDarkTheme) DarkAccent2PS else LightAccent2PS
    activePlatformColor == PlatformColor.XBOX -> if (isDarkTheme) DarkAccent2Xbox else LightAccent2Xbox
    activePlatformColor == PlatformColor.STEAM -> if (isDarkTheme) DarkAccent2Steam else LightAccent2Steam
    else -> if (isDarkTheme) DarkAccent2Paragon else LightAccent2Paragon
}

val AccentSoft: Color get() = when {
    activeCustomAccentColor != null && activeCustomAccentColor != -1L -> Color(activeCustomAccentColor!!).copy(alpha = 0.15f)
    activeDynamicAccentColor != null -> activeDynamicAccentColor!!.copy(alpha = 0.15f)
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
