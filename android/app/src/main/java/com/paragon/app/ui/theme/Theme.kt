package com.paragon.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    background = Background,
    surface = Surface,
    surfaceVariant = Surface2,
    primary = Accent,
    secondary = Accent2,
    onBackground = Foreground,
    onSurface = Foreground,
    onSurfaceVariant = Muted,
    outline = Border,
    error = Danger
)

@Composable
fun ParagonTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    // For now, force dark theme as the default is dark
    val colorScheme = DarkColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
