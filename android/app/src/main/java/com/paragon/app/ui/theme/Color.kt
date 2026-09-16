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
internal var isDarkTheme by mutableStateOf(true)

// --- Oscuro (el de siempre) ---
private val DarkBackground = Color(0xFF000000)
private val DarkSurface = Color(0xFF0C0C0C)
private val DarkSurface2 = Color(0xFF161616)
private val DarkBorder = Color(0xFF262626)
private val DarkForeground = Color(0xFFFFFFFF)
private val DarkMuted = Color(0xFFA0A0A0)
private val DarkAccent = Color(0xFFB026FF) // Neon Purple
private val DarkAccent2 = Color(0xFFE08FFF)
private val DarkAccentSoft = Color(0x23B026FF) // ~14% opacity
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
private val LightAccent = Color(0xFF1D6FE0)
private val LightAccent2 = Color(0xFF1B6E93)
private val LightAccentSoft = Color(0x1A1D6FE0) // ~10% opacity
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

val Accent: Color get() = if (isDarkTheme) DarkAccent else LightAccent
val Accent2: Color get() = if (isDarkTheme) DarkAccent2 else LightAccent2
val AccentSoft: Color get() = if (isDarkTheme) DarkAccentSoft else LightAccentSoft

// Trophy Grades
val Bronze: Color get() = if (isDarkTheme) DarkBronze else LightBronze
val Silver: Color get() = if (isDarkTheme) DarkSilver else LightSilver
val Gold: Color get() = if (isDarkTheme) DarkGold else LightGold
val Platinum: Color get() = if (isDarkTheme) DarkPlatinum else LightPlatinum

// Utility
val Good: Color get() = if (isDarkTheme) DarkGood else LightGood
val Danger: Color get() = if (isDarkTheme) DarkDanger else LightDanger
