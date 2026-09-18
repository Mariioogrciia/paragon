package com.paragon.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import com.paragon.app.data.theme.ThemeMode
import com.paragon.app.data.theme.PlatformColor

import android.os.Build
import androidx.compose.material3.Typography
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import com.paragon.app.data.theme.ThemeStore

@Composable
fun ParagonTheme(
    themeStore: ThemeStore,
    content: @Composable () -> Unit
) {
    val mode = themeStore.mode
    val platform = themeStore.platform
    val useDynamicColor = themeStore.useDynamicColor
    val customAccentColor = themeStore.customAccentColor
    val fontFamilyIndex = themeStore.fontFamily
    val dark = when (mode) {
        ThemeMode.SISTEMA -> isSystemInDarkTheme()
        ThemeMode.CLARO -> false
        ThemeMode.OSCURO -> true
    }

    // Se escribe ANTES de construir el colorScheme (no en un SideEffect,
    // que solo corre después de esta composición) para que Background/
    // Foreground/etc. — usados directo por casi todas las pantallas, sin
    // el primer frame, sin parpadeo del tema equivocado.
    isDarkTheme = dark
    activePlatformColor = platform

    activeCustomAccentColor = customAccentColor

    val context = LocalContext.current
    val dynamicScheme = if (useDynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    } else null

    // Se guarda el `ColorScheme` completo (no solo `primary`) para que
    // `Background`/`Surface`/`Border` en Color.kt también salgan del fondo
    // de pantalla real cuando Material You está activo, no solo el acento.
    activeDynamicScheme = dynamicScheme

    val colorScheme = dynamicScheme ?: if (dark) {
        darkColorScheme(
            background = Background,
            surface = Surface,
            surfaceVariant = Surface2,
            primary = Accent,
            secondary = Accent2,
            onBackground = Foreground,
            onSurface = Foreground,
            onSurfaceVariant = Muted,
            outline = Border,
            error = Danger,
        )
    } else {
        lightColorScheme(
            background = Background,
            surface = Surface,
            surfaceVariant = Surface2,
            primary = Accent,
            secondary = Accent2,
            onBackground = Foreground,
            onSurface = Foreground,
            onSurfaceVariant = Muted,
            outline = Border,
            error = Danger,
        )
    }

    val overridePrimary = customAccentColor?.let { Color(it) }
    val finalColorScheme = if (overridePrimary != null && overridePrimary.value.toLong() != -1L) {
        colorScheme.copy(
            primary = overridePrimary,
            secondary = overridePrimary.copy(alpha = 0.8f)
        )
    } else {
        colorScheme
    }

    val family = when (fontFamilyIndex) {
        1 -> FontFamily.Serif
        2 -> FontFamily.Monospace
        3 -> FontFamily.Cursive
        else -> FontFamily.SansSerif
    }

    val typography = Typography(
        displayLarge = MaterialTheme.typography.displayLarge.copy(fontFamily = family),
        displayMedium = MaterialTheme.typography.displayMedium.copy(fontFamily = family),
        displaySmall = MaterialTheme.typography.displaySmall.copy(fontFamily = family),
        headlineLarge = MaterialTheme.typography.headlineLarge.copy(fontFamily = family),
        headlineMedium = MaterialTheme.typography.headlineMedium.copy(fontFamily = family),
        headlineSmall = MaterialTheme.typography.headlineSmall.copy(fontFamily = family),
        titleLarge = MaterialTheme.typography.titleLarge.copy(fontFamily = family),
        titleMedium = MaterialTheme.typography.titleMedium.copy(fontFamily = family),
        titleSmall = MaterialTheme.typography.titleSmall.copy(fontFamily = family),
        bodyLarge = MaterialTheme.typography.bodyLarge.copy(fontFamily = family),
        bodyMedium = MaterialTheme.typography.bodyMedium.copy(fontFamily = family),
        bodySmall = MaterialTheme.typography.bodySmall.copy(fontFamily = family),
        labelLarge = MaterialTheme.typography.labelLarge.copy(fontFamily = family),
        labelMedium = MaterialTheme.typography.labelMedium.copy(fontFamily = family),
        labelSmall = MaterialTheme.typography.labelSmall.copy(fontFamily = family)
    )

    MaterialTheme(
        colorScheme = finalColorScheme,
        typography = typography,
        content = content
    )
}
