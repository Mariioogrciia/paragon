package com.paragon.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import com.paragon.app.data.theme.ThemeMode
import com.paragon.app.data.theme.PlatformColor

@Composable
fun ParagonTheme(
    mode: ThemeMode = ThemeMode.SISTEMA,
    platform: PlatformColor = PlatformColor.PARAGON,
    content: @Composable () -> Unit
) {
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

    val colorScheme = if (dark) {
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

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
